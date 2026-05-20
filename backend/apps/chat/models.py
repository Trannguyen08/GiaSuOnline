from django.db import models
from django.conf import settings
from apps.bookings.models import Booking


class ChatRoom(models.Model):
    booking = models.OneToOneField(
        Booking, on_delete=models.CASCADE, related_name="chat_room"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"ChatRoom for Booking {self.booking.id}"


class Message(models.Model):
    room = models.ForeignKey(
        ChatRoom, on_delete=models.CASCADE, related_name="messages"
    )
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Message from {self.sender.username} in Room {self.room.id}"
