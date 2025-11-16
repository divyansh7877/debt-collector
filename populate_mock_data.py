"""
Script to populate the database with mock user data for testing.
Run this script to add sample users with realistic debt collection data.
"""

from datetime import datetime, timedelta
from app.database import SessionLocal, engine
from app.models import Base, User, Group

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

def add_mock_users():
    """Add mock users with various service types and payment statuses."""
    db = SessionLocal()
    
    try:
        # Mock user data with different scenarios
        mock_users = [
            {
                "name": "Div",
                "details": {
                    "type_of_service": "Spider Control",
                    "area_of_service": 4000,
                    "cost": 10000,
                    "due_date": "2025-11-10",
                    "status": "overdue",
                    "payment_received": [
                        {"date": "2025-10-15", "amount": 2000},
                        {"date": "2025-11-01", "amount": 1500},
                    ],
                    "amount_owed": 6500,
                    "days_overdue": 5,
                    "contact_methods": [
                        {"method": "email", "value": "div@example.com", "label": "Primary Email", "is_preferred": True},
                        {"method": "phone", "value": "+91-98765-43210", "label": "Mobile", "is_preferred": False},
                        {"method": "phone", "value": "+91-98765-43211", "label": "Office", "is_preferred": False},
                    ],
                    "preferred_contact": "email",
                },
                "status": "pending"
            },
            {
                "name": "Sarah Johnson",
                "details": {
                    "type_of_service": "Termite Treatment",
                    "area_of_service": 3500,
                    "cost": 15000,
                    "due_date": "2025-10-20",
                    "status": "overdue",
                    "payment_received": [
                        {"date": "2025-09-20", "amount": 3000},
                    ],
                    "amount_owed": 12000,
                    "days_overdue": 26,
                    "contact_methods": [
                        {"method": "phone", "value": "+91-98765-11111", "label": "Mobile", "is_preferred": True},
                        {"method": "email", "value": "sarah.j@example.com", "label": "Personal Email", "is_preferred": False},
                    ],
                    "preferred_contact": "phone",
                },
                "status": "ongoing"
            },
            {
                "name": "Michael Chen",
                "details": {
                    "type_of_service": "Mosquito Control",
                    "area_of_service": 2500,
                    "cost": 8000,
                    "due_date": "2025-12-01",
                    "status": "pending",
                    "payment_received": [],
                    "amount_owed": 8000,
                    "days_overdue": 0,
                },
                "status": "pending"
            },
            {
                "name": "Emily Rodriguez",
                "details": {
                    "type_of_service": "Rodent Control",
                    "area_of_service": 5000,
                    "cost": 12000,
                    "due_date": "2025-09-30",
                    "status": "overdue",
                    "payment_received": [
                        {"date": "2025-09-15", "amount": 2000},
                        {"date": "2025-10-10", "amount": 2500},
                        {"date": "2025-11-05", "amount": 1500},
                    ],
                    "amount_owed": 6000,
                    "days_overdue": 46,
                },
                "status": "ongoing"
            },
            {
                "name": "David Kim",
                "details": {
                    "type_of_service": "General Pest Control",
                    "area_of_service": 3000,
                    "cost": 7500,
                    "due_date": "2025-11-25",
                    "status": "pending",
                    "payment_received": [
                        {"date": "2025-11-10", "amount": 7500},
                    ],
                    "amount_owed": 0,
                    "days_overdue": 0,
                },
                "status": "finished"
            },
            {
                "name": "Lisa Thompson",
                "details": {
                    "type_of_service": "Bed Bug Treatment",
                    "area_of_service": 1800,
                    "cost": 20000,
                    "due_date": "2025-10-15",
                    "status": "overdue",
                    "payment_received": [
                        {"date": "2025-10-01", "amount": 5000},
                    ],
                    "amount_owed": 15000,
                    "days_overdue": 31,
                },
                "status": "pending"
            },
            {
                "name": "James Wilson",
                "details": {
                    "type_of_service": "Cockroach Control",
                    "area_of_service": 2800,
                    "cost": 9000,
                    "due_date": "2025-11-20",
                    "status": "pending",
                    "payment_received": [
                        {"date": "2025-11-08", "amount": 4500},
                    ],
                    "amount_owed": 4500,
                    "days_overdue": 0,
                },
                "status": "pending"
            },
            {
                "name": "Maria Garcia",
                "details": {
                    "type_of_service": "Ant Control",
                    "area_of_service": 3200,
                    "cost": 6000,
                    "due_date": "2025-09-15",
                    "status": "overdue",
                    "payment_received": [],
                    "amount_owed": 6000,
                    "days_overdue": 61,
                },
                "status": "ongoing"
            },
        ]
        
        # Check if users already exist
        existing_users = db.query(User).all()
        if existing_users:
            print(f"Database already contains {len(existing_users)} users.")
            response = input("Do you want to add more mock users? (y/n): ")
            if response.lower() != 'y':
                print("Skipping mock data creation.")
                return
        
        # Add users to database
        created_count = 0
        for user_data in mock_users:
            user = User(
                name=user_data["name"],
                details=user_data["details"],
                status=user_data["status"]
            )
            db.add(user)
            created_count += 1
        
        db.commit()
        print(f"✓ Successfully created {created_count} mock users!")
        
        # Display summary
        print("\nMock User Summary:")
        print("-" * 80)
        all_users = db.query(User).all()
        for user in all_users:
            service = user.details.get("type_of_service", "N/A")
            cost = user.details.get("cost", 0)
            owed = user.details.get("amount_owed", 0)
            status = user.details.get("status", "N/A")
            print(f"  {user.id}. {user.name:20s} | {service:25s} | ₹{cost:,} | Owed: ₹{owed:,} | {status}")
        print("-" * 80)
        
    except Exception as e:
        db.rollback()
        print(f"Error adding mock users: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("Populating database with mock user data...")
    add_mock_users()
