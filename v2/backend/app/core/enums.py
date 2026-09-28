"""Centralized Enum Definitions for Namma Connect V2."""

from enum import Enum


class UserRole(str, Enum):
    """Canonical User Roles."""
    CUSTOMER = "CUSTOMER"
    PARTNER = "PARTNER"
    ADMIN = "ADMIN"


class AuthProvider(str, Enum):
    """Authentication Providers."""
    LOCAL = "local"
    GOOGLE = "google"
    OTP = "otp"


class PartnerRoleType(str, Enum):
    """Provider / Partner Hosting Categories."""
    FARMER = "farmer"
    GUIDE = "guide"
    HOMESTAY = "homestay"
    ARTISAN = "artisan"
    DRIVER = "driver"
    HOTEL = "hotel"
    EXPERIENCE = "experience"
    OTHER = "other"


class ApplicationStatus(str, Enum):
    """Partner Application Lifecycle Status."""
    DRAFT = "DRAFT"
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CHANGES_REQUESTED = "CHANGES_REQUESTED"


class MarketplaceType(str, Enum):
    """Marketplace Category and Service Types."""
    ACTIVITY = "ACTIVITY"
    HOTEL_STAY = "HOTEL_STAY"
    FOOD = "FOOD"
    TRANSPORT = "TRANSPORT"
    GUIDED_TOUR = "GUIDED_TOUR"
    WORKSHOP = "WORKSHOP"
    EXPERIENCE = "EXPERIENCE"


class ServiceStatus(str, Enum):
    """Marketplace Service Lifecycle & Moderation Status."""
    DRAFT = "DRAFT"
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    PUBLISHED = "PUBLISHED"
    REJECTED = "REJECTED"
    SUSPENDED = "SUSPENDED"


class BookingStatus(str, Enum):
    """Authoritative Booking Lifecycle Status."""
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class PaymentStatus(str, Enum):
    """Payment Transaction Status."""
    PENDING = "PENDING"
    ORDER_CREATED = "ORDER_CREATED"
    PAID = "PAID"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


class RefundStatus(str, Enum):
    """Refund Lifecycle Status."""
    PENDING = "PENDING"
    PROCESSED = "PROCESSED"
    FAILED = "FAILED"


class PayoutStatus(str, Enum):
    """Provider Payout Lifecycle Status."""
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    PROCESSING = "PROCESSING"
    PAID = "PAID"
    REJECTED = "REJECTED"


class ReviewStatus(str, Enum):
    """Customer Review Moderation Status."""
    PENDING = "PENDING"
    PUBLISHED = "PUBLISHED"
    FLAGGED = "FLAGGED"
    REMOVED = "REMOVED"


class TripStatus(str, Enum):
    """Trip Planning Container Status."""
    DRAFT = "DRAFT"
    PLANNED = "PLANNED"
    CONFIRMED = "CONFIRMED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class TripItemType(str, Enum):
    """Trip Item Types."""
    SERVICE = "SERVICE"
    ACTIVITY = "ACTIVITY"
    STAY = "STAY"
    FOOD = "FOOD"
    TRANSPORT = "TRANSPORT"
    CUSTOM = "CUSTOM"


class InteractionEventType(str, Enum):
    """Behavioral Tracking Interaction Event Types."""
    VIEW = "VIEW"
    DETAIL_OPEN = "DETAIL_OPEN"
    CLICK = "CLICK"
    SAVE = "SAVE"
    UNSAVE = "UNSAVE"
    BOOK = "BOOK"
    SEARCH = "SEARCH"
    SHARE = "SHARE"
    DISMISS = "DISMISS"
    ADD_TO_TRIP = "ADD_TO_TRIP"


class RecommendationType(str, Enum):
    """Recommendation Algorithm Source Types."""
    PERSONALIZED = "PERSONALIZED"
    CONTENT_BASED = "CONTENT_BASED"
    COLLABORATIVE = "COLLABORATIVE"
    TRENDING = "TRENDING"
    RECENT_ACTIVITY = "RECENT_ACTIVITY"
    SIMILAR_USERS = "SIMILAR_USERS"


class RecommendationFeedbackType(str, Enum):
    """Recommendation Feedback Types."""
    LIKE = "LIKE"
    DISLIKE = "DISLIKE"
    NOT_INTERESTED = "NOT_INTERESTED"
    HIDE = "HIDE"
    RELEVANT = "RELEVANT"
    IRRELEVANT = "IRRELEVANT"


class AIMessageRole(str, Enum):
    """AI Conversational Message Roles."""
    USER = "USER"
    ASSISTANT = "ASSISTANT"
    SYSTEM = "SYSTEM"


class AIContextType(str, Enum):
    """AI Conversation Context Scope."""
    TRAVEL = "TRAVEL"
    RECOMMENDATION = "RECOMMENDATION"
    TRIP_PLANNING = "TRIP_PLANNING"
    GENERAL = "GENERAL"


class SupportTicketStatus(str, Enum):
    """Customer Support Ticket Status."""
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class SupportTicketPriority(str, Enum):
    """Support Ticket Priority Level."""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


class NotificationType(str, Enum):
    """Notification Category Types."""
    BOOKING = "BOOKING"
    PAYMENT = "PAYMENT"
    PARTNER = "PARTNER"
    SYSTEM = "SYSTEM"
    MESSAGE = "MESSAGE"
    PROMOTION = "PROMOTION"
