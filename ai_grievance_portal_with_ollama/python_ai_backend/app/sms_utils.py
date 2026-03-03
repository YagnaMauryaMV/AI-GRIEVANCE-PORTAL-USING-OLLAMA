from twilio.rest import Client
from .config import settings


def send_sms(mobile: str, message: str):
    """
    Sends SMS using Twilio.
    This reuses the Twilio account settings from .env via Settings().
    """

    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN or not settings.TWILIO_FROM_NUMBER:
        print(f"[SMS] Twilio not configured. SMS to {mobile}: {message}")
        return

    try:
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

        formatted_number = mobile
        if not mobile.startswith("+"):
            formatted_number = f"+91{mobile}"

        client.messages.create(
            to=formatted_number,
            from_=settings.TWILIO_FROM_NUMBER,
            body=message
        )

        print(f"[SMS] Sent to {formatted_number}: {message}")

    except Exception as e:
        print(f"[SMS ERROR] Failed to send SMS to {mobile}: {e}")