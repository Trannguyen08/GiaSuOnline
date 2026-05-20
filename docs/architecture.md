# Architecture

## Clean Architecture
Clean Architecture isolates the domain logic from the infrastructure and UI.
- Domain: Contains entities and business rules.
- Repository: Handles data access abstractions.
- Service: Contains application-specific business logic.
- API: Translates HTTP requests to service calls.

The dependency rule dictates that inner layers cannot depend on outer layers. 
Services depend on Repositories, Repositories depend on Domain, API depends on Services.

## Bounded Contexts
Each Django app represents a bounded context (Users, Tutors, Bookings, Chat, Notifications).
