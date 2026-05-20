from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Q, Min
from datetime import time
from django.conf import settings
import json
from urllib import request as urlrequest
from urllib.error import URLError, HTTPError
from .models import TutorProfile, Subject
from .serializers import TutorProfileSerializer, SubjectSerializer
from apps.courses.models import CourseReview
from apps.courses.serializers import CourseReviewSerializer

class TutorSettingsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            profile = request.user.teaching_profile
            serializer = TutorProfileSerializer(profile)
            return Response(serializer.data)
        except TutorProfile.DoesNotExist:
            # Create profile if it doesn't exist (for existing users)
            profile = TutorProfile.objects.create(user=request.user)
            serializer = TutorProfileSerializer(profile)
            return Response(serializer.data)

    def patch(self, request):
        try:
            profile = request.user.teaching_profile
            serializer = TutorProfileSerializer(profile, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except TutorProfile.DoesNotExist:
            return Response({"error": "Tutor profile not found"}, status=status.HTTP_404_NOT_FOUND)

class SubjectListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        subjects = Subject.objects.all()
        serializer = SubjectSerializer(subjects, many=True)
        return Response(serializer.data)

class TutorPublicListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        queryset = TutorProfile.objects.filter(is_available=True).select_related(
            'user', 'user__tutor_profile'
        ).prefetch_related('tutor_subjects__subject', 'educations', 'certifications')
        
        # Filtering
        subject = request.query_params.get('subject')
        if subject:
            if str(subject).isdigit():
                queryset = queryset.filter(tutor_subjects__subject_id=subject)
            else:
                queryset = queryset.filter(tutor_subjects__subject__name__icontains=subject)
            
        level = request.query_params.get('level')
        if level:
            queryset = queryset.filter(tutor_subjects__level=level)

        min_price = request.query_params.get('min_price')
        if min_price:
            queryset = queryset.filter(tutor_subjects__hourly_rate__gte=min_price)

        max_price = request.query_params.get('max_price')
        if max_price:
            queryset = queryset.filter(tutor_subjects__hourly_rate__lte=max_price)

        min_rating = request.query_params.get('min_rating')
        if min_rating:
            queryset = queryset.filter(rating_avg__gte=min_rating)

        max_rating = request.query_params.get('max_rating')
        if max_rating:
            queryset = queryset.filter(rating_avg__lte=max_rating)

        university = request.query_params.get('university')
        if university:
            queryset = queryset.filter(user__tutor_profile__university__icontains=university)

        location = request.query_params.get('location')
        if location:
            queryset = queryset.filter(Q(location__icontains=location) | Q(user__tutor_profile__address__icontains=location))

        weekdays = self._list_param(request, 'weekdays')
        if weekdays:
            django_weekdays = []
            for value in weekdays:
                if str(value).isdigit():
                    day = int(value)
                    django_weekdays.append(1 if day == 0 else day + 1)
            if django_weekdays:
                queryset = queryset.filter(
                    teaching_slots__status='available',
                    teaching_slots__start_time__week_day__in=django_weekdays,
                )

        time_ranges = self._time_ranges(request)
        if time_ranges:
            time_query = Q()
            for start, end in time_ranges:
                time_query |= Q(
                    teaching_slots__status='available',
                    teaching_slots__start_time__time__gte=start,
                    teaching_slots__end_time__time__lte=end,
                )
            queryset = queryset.filter(time_query)
            
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(full_name__icontains=search) |
                Q(title__icontains=search) |
                Q(bio__icontains=search)
            )

        sort = request.query_params.get('sort')
        if sort == 'price_asc':
            queryset = queryset.annotate(min_rate=Min('tutor_subjects__hourly_rate')).order_by('min_rate')
        elif sort == 'price_desc':
            queryset = queryset.annotate(min_rate=Min('tutor_subjects__hourly_rate')).order_by('-min_rate')
        elif sort == 'rating_desc':
            queryset = queryset.order_by('-rating_avg', '-total_reviews')

        serializer = TutorProfileSerializer(queryset.distinct(), many=True, context={'request': request})
        return Response(serializer.data)

    def _list_param(self, request, key):
        values = request.query_params.getlist(key)
        if len(values) == 1 and ',' in values[0]:
            values = [item.strip() for item in values[0].split(',')]
        return [value for value in values if value not in ['', None]]

    def _time_ranges(self, request):
        starts = self._list_param(request, 'start_times')
        ends = self._list_param(request, 'end_times')
        ranges = []
        for start_text, end_text in zip(starts, ends):
            try:
                start = time.fromisoformat(start_text)
                end = time.fromisoformat(end_text)
            except ValueError:
                continue
            if start < end:
                ranges.append((start, end))
        return ranges

class TutorPublicDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        try:
            profile = TutorProfile.objects.select_related(
                'user', 'user__tutor_profile'
            ).prefetch_related(
                'tutor_subjects__subject', 'educations', 'certifications', 'documents'
            ).get(pk=pk, is_available=True)
            serializer = TutorProfileSerializer(profile, context={'request': request})
            return Response(serializer.data)
        except TutorProfile.DoesNotExist:
            return Response({"error": "Tutor not found"}, status=status.HTTP_404_NOT_FOUND)


class TutorPublicReviewListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        reviews = CourseReview.objects.filter(
            tutor_id=pk
        ).select_related('student', 'course__subject').order_by('-created_at')
        return Response(CourseReviewSerializer(reviews, many=True, context={'request': request}).data)


class TutorQuickSearchView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        prompt = (request.data.get('prompt') or '').strip()
        if not prompt:
            return Response({'prompt': 'This field is required.'}, status=status.HTTP_400_BAD_REQUEST)

        ai_result = self.parse_prompt(prompt)
        criteria = ai_result.get('criteria') or {}
        queryset = self.query_tutors(criteria)
        serializer = TutorProfileSerializer(queryset[:12], many=True, context={'request': request})
        return Response({
            'criteria': criteria,
            'used_llm': ai_result.get('used_llm', False),
            'tutors': serializer.data,
        })

    def parse_prompt(self, prompt):
        payload = json.dumps({'prompt': prompt}).encode('utf-8')
        req = urlrequest.Request(
            f"{settings.AI_SERVICE_URL.rstrip('/')}/parse-tutor-search",
            data=payload,
            headers={'Content-Type': 'application/json'},
            method='POST',
        )
        try:
            with urlrequest.urlopen(req, timeout=12) as response:
                return json.loads(response.read().decode('utf-8'))
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError):
            return {'criteria': {'subjects': [prompt], 'notes': prompt}, 'used_llm': False}

    def query_tutors(self, criteria):
        queryset = TutorProfile.objects.filter(is_available=True).select_related(
            'user', 'user__tutor_profile'
        ).prefetch_related('tutor_subjects__subject', 'educations', 'certifications')

        subject_query = Q()
        for subject in criteria.get('subjects') or []:
            subject_query |= Q(tutor_subjects__subject__name__icontains=subject)
        if subject_query:
            queryset = queryset.filter(subject_query)

        location = criteria.get('location')
        if location:
            queryset = queryset.filter(
                Q(location__icontains=location) |
                Q(user__tutor_profile__address__icontains=location) |
                Q(user__tutor_profile__teaching_region__icontains=location)
            )

        university = criteria.get('university')
        if university:
            queryset = queryset.filter(user__tutor_profile__university__icontains=university)

        min_price = criteria.get('min_price')
        if min_price:
            queryset = queryset.filter(tutor_subjects__hourly_rate__gte=min_price)
        max_price = criteria.get('max_price')
        if max_price:
            queryset = queryset.filter(tutor_subjects__hourly_rate__lte=max_price)

        min_rating = criteria.get('min_rating')
        if min_rating:
            queryset = queryset.filter(rating_avg__gte=min_rating)

        for level in criteria.get('teaching_levels') or []:
            queryset = queryset.filter(
                Q(user__tutor_profile__teaching_levels__contains=[level]) |
                Q(tutor_subjects__level__icontains=level)
            )

        weekdays = criteria.get('weekdays') or []
        if weekdays:
            django_weekdays = [1 if int(day) == 0 else int(day) + 1 for day in weekdays if str(day).isdigit()]
            if django_weekdays:
                queryset = queryset.filter(
                    teaching_slots__status='available',
                    teaching_slots__start_time__week_day__in=django_weekdays,
                )

        time_query = Q()
        for item in criteria.get('time_ranges') or []:
            try:
                start = time.fromisoformat(item.get('start') or '')
                end = time.fromisoformat(item.get('end') or '')
            except ValueError:
                continue
            if start < end:
                time_query |= Q(
                    teaching_slots__status='available',
                    teaching_slots__start_time__time__gte=start,
                    teaching_slots__end_time__time__lte=end,
                )
        if time_query:
            queryset = queryset.filter(time_query)

        return queryset.annotate(min_rate=Min('tutor_subjects__hourly_rate')).order_by('-rating_avg', 'min_rate').distinct()
