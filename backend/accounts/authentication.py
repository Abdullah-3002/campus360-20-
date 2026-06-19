from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import get_user_model
import jwt
from django.conf import settings

User = get_user_model()

class JWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        # Get the authorization header
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            return None  # No authentication, let other methods handle it
        
        try:
            # Split the header into prefix and token
            parts = auth_header.split()
            
            if len(parts) != 2:
                raise AuthenticationFailed('Invalid authorization header format. Use: Bearer <token>')
            
            prefix, token = parts
            
            if prefix.lower() != 'bearer':
                raise AuthenticationFailed('Invalid token prefix. Use: Bearer')
            
            # Decode the token
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            
            # Get user_id from payload - use 'user_id' not 'id'
            user_id = payload.get('user_id')
            if not user_id:
                raise AuthenticationFailed('Invalid token payload: missing user_id')
            
            # Get the user
            user = User.objects.get(user_id=user_id, is_active=True)
            
            # Return user and token
            return (user, token)
            
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Token has expired')
        except jwt.InvalidTokenError:
            raise AuthenticationFailed('Invalid token')
        except User.DoesNotExist:
            raise AuthenticationFailed('User not found or inactive')
        except Exception as e:
            raise AuthenticationFailed(f'Authentication failed: {str(e)}')
    
    def authenticate_header(self, request):
        """Return a string to be used as the value of the WWW-Authenticate header"""
        return 'Bearer'