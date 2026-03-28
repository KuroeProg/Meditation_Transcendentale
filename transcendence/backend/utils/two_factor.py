"""
Two-Factor Authentication (2FA) utilities using Redis for temporary code storage.
Handles code generation, verification, email delivery, and rate limiting.
"""

import random
import logging
from django.core.mail import send_mail
from django.conf import settings
from django_redis import get_redis_connection
from django.core.exceptions import ImproperlyConfigured

logger = logging.getLogger(__name__)

# Redis key prefixes
REDIS_2FA_CODE_PREFIX = "2fa_code"
REDIS_2FA_FAILED_PREFIX = "2fa_failed"
REDIS_2FA_BLOCKED_PREFIX = "2fa_blocked"

# Configuration
CODE_LENGTH = 6
CODE_TTL = 300  # 5 minutes
MAX_FAILED_ATTEMPTS = 3
FAILED_ATTEMPTS_WINDOW = 600  # 10 minutes
BLOCK_DURATION = 600  # 10 minutes


def get_redis_connection_safe():
    """
    Safely retrieve Redis connection with error handling.
    
    Returns:
        Redis connection or None if unavailable.
    """
    try:
        return get_redis_connection("default")
    except (ImproperlyConfigured, Exception) as e:
        logger.error(f"Redis connection failed: {e}")
        return None


def generate_2fa_code(user_id: int) -> str:
    """
    Generate a 6-digit random 2FA code and store in Redis with TTL.
    
    Args:
        user_id: The user's database ID
        
    Returns:
        The generated 6-digit code as a string, or empty string on failure.
        
    Raises:
        Exception: If Redis is unavailable (logged, not raised).
    """
    try:
        redis_conn = get_redis_connection_safe()
        if not redis_conn:
            logger.error(f"Cannot generate 2FA code for user {user_id}: Redis unavailable")
            return ""
        
        # Generate 6-digit code
        code = "".join([str(random.randint(0, 9)) for _ in range(CODE_LENGTH)])
        
        # Store in Redis with TTL
        redis_key = f"{REDIS_2FA_CODE_PREFIX}:{user_id}"
        redis_conn.setex(redis_key, CODE_TTL, code)
        
        logger.info(f"Generated 2FA code for user {user_id}")
        return code
        
    except Exception as e:
        logger.error(f"Error generating 2FA code for user {user_id}: {e}")
        return ""


def verify_2fa_code(user_id: int, submitted_code: str) -> dict:
    """
    Verify a 2FA code against the one stored in Redis.
    Handles rate limiting: blocks after 3 failed attempts for 10 minutes.
    
    Args:
        user_id: The user's database ID
        submitted_code: The code submitted by the user (should be string)
        
    Returns:
        Dictionary with keys:
        - 'valid' (bool): Whether the code is valid
        - 'error' (str or None): Error message if not valid
        - 'blocked' (bool): Whether the user is rate-limited
    """
    try:
        redis_conn = get_redis_connection_safe()
        if not redis_conn:
            logger.error(f"Cannot verify 2FA code for user {user_id}: Redis unavailable")
            return {
                'valid': False,
                'error': 'Internal error: verification service unavailable',
                'blocked': False
            }
        
        # Check if user is blocked due to rate limiting
        blocked_key = f"{REDIS_2FA_BLOCKED_PREFIX}:{user_id}"
        if redis_conn.exists(blocked_key):
            logger.warning(f"User {user_id} is rate-limited for 2FA attempts")
            return {
                'valid': False,
                'error': 'Too many failed attempts. Please try again in 10 minutes.',
                'blocked': True
            }
        
        # Get stored code
        code_key = f"{REDIS_2FA_CODE_PREFIX}:{user_id}"
        stored_code = redis_conn.get(code_key)
        
        if not stored_code:
            logger.warning(f"No valid 2FA code found for user {user_id}")
            return {
                'valid': False,
                'error': '2FA code expired. Please request a new one.',
                'blocked': False
            }
        
        # Decode if bytes
        if isinstance(stored_code, bytes):
            stored_code = stored_code.decode('utf-8')
        
        submitted_code_clean = str(submitted_code).strip()
        
        # Verify code
        if stored_code == submitted_code_clean:
            # Success: delete the code to prevent reuse
            redis_conn.delete(code_key)
            # Clear failed attempts counter
            failed_key = f"{REDIS_2FA_FAILED_PREFIX}:{user_id}"
            redis_conn.delete(failed_key)
            logger.info(f"User {user_id} successfully verified 2FA code")
            return {
                'valid': True,
                'error': None,
                'blocked': False
            }
        else:
            # Failed attempt: increment counter
            failed_key = f"{REDIS_2FA_FAILED_PREFIX}:{user_id}"
            failed_count = redis_conn.incr(failed_key)
            
            # Set expiry on first failure
            if failed_count == 1:
                redis_conn.expire(failed_key, FAILED_ATTEMPTS_WINDOW)
            
            logger.warning(f"User {user_id} submitted invalid 2FA code (attempt {failed_count})")
            
            # Check if user should be blocked
            if failed_count >= MAX_FAILED_ATTEMPTS:
                redis_conn.setex(blocked_key, BLOCK_DURATION, "1")
                logger.warning(f"User {user_id} blocked after {failed_count} failed 2FA attempts")
                return {
                    'valid': False,
                    'error': 'Too many failed attempts. Please try again in 10 minutes.',
                    'blocked': True
                }
            
            remaining_attempts = MAX_FAILED_ATTEMPTS - failed_count
            return {
                'valid': False,
                'error': f'Invalid code. {remaining_attempts} attempt(s) remaining.',
                'blocked': False
            }
            
    except Exception as e:
        logger.error(f"Error verifying 2FA code for user {user_id}: {e}")
        return {
            'valid': False,
            'error': 'Internal error: verification failed',
            'blocked': False
        }


def send_2fa_email(user_email: str, code: str) -> bool:
    """
    Send 2FA code via email using Django's send_mail.
    
    Args:
        user_email: Recipient email address
        code: The 2FA code to send
        
    Returns:
        True if email sent successfully, False otherwise.
    """
    try:
        subject = "Your Two-Factor Authentication Code"
        message = f"""
Hello,

Your Two-Factor Authentication code is: {code}

This code will expire in 5 minutes. Please do not share this code with anyone.

If you did not request this code, please ignore this email.

Best regards,
Transcendence Team
        """.strip()
        
        html_message = f"""
<html>
    <body>
        <p>Hello,</p>
        <p>Your Two-Factor Authentication code is:</p>
        <h2 style="font-family: monospace; text-align: center; background-color: #f0f0f0; padding: 10px; border-radius: 5px;">
            {code}
        </h2>
        <p>This code will expire in <strong>5 minutes</strong>. Please do not share this code with anyone.</p>
        <p>If you did not request this code, please ignore this email.</p>
        <p>Best regards,<br/>Transcendence Team</p>
    </body>
</html>
        """
        
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user_email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info(f"2FA code sent to {user_email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send 2FA email to {user_email}: {e}")
        return False


def clear_2fa_verification(user_id: int) -> None:
    """
    Clear all 2FA-related Redis keys for a user (code, failed attempts, block).
    Useful for cleanup or manual verification reset.
    
    Args:
        user_id: The user's database ID
    """
    try:
        redis_conn = get_redis_connection_safe()
        if not redis_conn:
            return
        
        code_key = f"{REDIS_2FA_CODE_PREFIX}:{user_id}"
        failed_key = f"{REDIS_2FA_FAILED_PREFIX}:{user_id}"
        blocked_key = f"{REDIS_2FA_BLOCKED_PREFIX}:{user_id}"
        
        redis_conn.delete(code_key, failed_key, blocked_key)
        logger.info(f"Cleared 2FA verification state for user {user_id}")
        
    except Exception as e:
        logger.error(f"Error clearing 2FA state for user {user_id}: {e}")


def is_user_blocked(user_id: int) -> bool:
    """
    Check if a user is currently blocked from 2FA attempts.
    
    Args:
        user_id: The user's database ID
        
    Returns:
        True if user is blocked, False otherwise.
    """
    try:
        redis_conn = get_redis_connection_safe()
        if not redis_conn:
            return False
        
        blocked_key = f"{REDIS_2FA_BLOCKED_PREFIX}:{user_id}"
        return redis_conn.exists(blocked_key) > 0
        
    except Exception as e:
        logger.error(f"Error checking block status for user {user_id}: {e}")
        return False
