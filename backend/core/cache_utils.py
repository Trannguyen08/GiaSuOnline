import hashlib
import json

from django.core.cache import cache


DEFAULT_READ_CACHE_TIMEOUT = 60 * 5


def cache_key(group, request=None, extra=None):
    version = cache.get(_version_key(group), 1)
    user_id = getattr(getattr(request, "user", None), "id", "anon")
    query = ""
    if request is not None:
        query = request.META.get("QUERY_STRING", "")
    payload = json.dumps(
        {"group": group, "version": version, "user": user_id, "query": query, "extra": extra},
        sort_keys=True,
        default=str,
    )
    digest = hashlib.sha256(payload.encode("utf-8")).hexdigest()
    return f"readcache:{group}:{version}:{digest}"


def get_cached_response(group, request=None, extra=None):
    return cache.get(cache_key(group, request=request, extra=extra))


def set_cached_response(group, data, request=None, extra=None, timeout=DEFAULT_READ_CACHE_TIMEOUT):
    cache.set(cache_key(group, request=request, extra=extra), data, timeout)


def invalidate_cache_groups(*groups):
    for group in groups:
        version_key = _version_key(group)
        try:
            cache.incr(version_key)
        except ValueError:
            cache.set(version_key, 2, None)


def _version_key(group):
    return f"readcache-version:{group}"
