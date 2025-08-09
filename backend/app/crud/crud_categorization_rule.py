"""
CRUD operations for CategorizationRule model
"""

from typing import List, Optional, Any, Dict
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc

from app.crud.base import CRUDBase
from app.db.models.categorization_rule import CategorizationRule
from app.schemas.categorization_rule import CategorizationRuleCreate, CategorizationRuleUpdate


class CRUDCategorizationRule(CRUDBase[CategorizationRule, CategorizationRuleCreate, CategorizationRuleUpdate]):
    """CRUD operations for CategorizationRule"""
    
    def get_by_user(
        self, 
        db: Session, 
        *, 
        user_id: Any,
        skip: int = 0,
        limit: int = 100,
        is_active: Optional[bool] = None,
        sort_by: str = "priority",
        sort_order: str = "asc"
    ) -> List[CategorizationRule]:
        """Get categorization rules for a user"""
        query = db.query(CategorizationRule).filter(CategorizationRule.user_id == user_id)
        
        # Filter by active status
        if is_active is not None:
            query = query.filter(CategorizationRule.is_active == is_active)
        
        # Sorting
        sort_column = getattr(CategorizationRule, sort_by, CategorizationRule.priority)
        if sort_order.lower() == "desc":
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))
        
        return query.offset(skip).limit(limit).all()
    
    def get_active_rules_for_user(
        self, 
        db: Session, 
        *, 
        user_id: Any
    ) -> List[CategorizationRule]:
        """Get all active categorization rules for a user, ordered by priority"""
        return (
            db.query(CategorizationRule)
            .filter(
                and_(
                    CategorizationRule.user_id == user_id,
                    CategorizationRule.is_active == True
                )
            )
            .order_by(CategorizationRule.priority.asc())
            .all()
        )
    
    def create_for_user(
        self, 
        db: Session, 
        *, 
        obj_in: CategorizationRuleCreate, 
        user_id: Any
    ) -> CategorizationRule:
        """Create a new categorization rule for a user"""
        db_obj = CategorizationRule(
            user_id=user_id,
            pattern=obj_in.pattern,
            pattern_type=obj_in.pattern_type,
            field_to_match=obj_in.field_to_match,
            category_id=obj_in.category_id,
            subcategory_id=obj_in.subcategory_id,
            name=obj_in.name,
            priority=obj_in.priority,
            is_active=obj_in.is_active,
            confidence=obj_in.confidence,
            notes=obj_in.notes
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def find_matching_rules(
        self, 
        db: Session, 
        *, 
        user_id: Any, 
        expense_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Find all rules that match the given expense data"""
        rules = self.get_active_rules_for_user(db, user_id=user_id)
        matches = []
        
        for rule in rules:
            match_result = rule.apply_to_expense_data(expense_data)
            if match_result:
                matches.append(match_result)
        
        # Sort by priority (lower number = higher priority)
        matches.sort(key=lambda x: next(
            (rule.priority for rule in rules if str(rule.id) == x["rule_id"]), 
            999
        ))
        
        return matches
    
    def get_best_match(
        self, 
        db: Session, 
        *, 
        user_id: Any, 
        expense_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Get the best matching rule for expense data"""
        matches = self.find_matching_rules(db, user_id=user_id, expense_data=expense_data)
        return matches[0] if matches else None
    
    def increment_rule_usage(
        self, 
        db: Session, 
        *, 
        rule_id: Any
    ) -> Optional[CategorizationRule]:
        """Increment usage statistics for a rule"""
        rule = self.get(db, id=rule_id)
        if rule:
            rule.increment_usage()
            db.commit()
            db.refresh(rule)
        return rule
    
    def create_from_expense_categorization(
        self,
        db: Session,
        *,
        user_id: Any,
        vendor: Optional[str] = None,
        description: Optional[str] = None,
        category_id: Optional[str] = None,
        subcategory_id: Optional[str] = None,
        create_vendor_rule: bool = True,
        create_description_rule: bool = False,
        confidence: int = 85
    ) -> List[CategorizationRule]:
        """Create categorization rules from user's expense categorization"""
        created_rules = []
        
        # Create vendor-based rule
        if create_vendor_rule and vendor and vendor.strip():
            vendor_rule = CategorizationRuleCreate(
                pattern=vendor.strip(),
                pattern_type="contains",
                field_to_match="vendor",
                category_id=category_id,
                subcategory_id=subcategory_id,
                name=f"Auto: {vendor.strip()[:30]}",
                priority=200,  # Auto-generated rules have lower priority
                confidence=confidence,
                notes=f"Auto-generated from user categorization"
            )
            
            # Check if similar rule already exists
            existing = (
                db.query(CategorizationRule)
                .filter(
                    and_(
                        CategorizationRule.user_id == user_id,
                        CategorizationRule.pattern == vendor_rule.pattern,
                        CategorizationRule.field_to_match == vendor_rule.field_to_match,
                        CategorizationRule.is_active == True
                    )
                )
                .first()
            )
            
            if not existing:
                created_rule = self.create_for_user(db, obj_in=vendor_rule, user_id=user_id)
                created_rules.append(created_rule)
        
        # Create description-based rule
        if create_description_rule and description and description.strip():
            description_rule = CategorizationRuleCreate(
                pattern=description.strip(),
                pattern_type="contains",
                field_to_match="description",
                category_id=category_id,
                subcategory_id=subcategory_id,
                name=f"Auto: {description.strip()[:30]}",
                priority=300,  # Lower priority than vendor rules
                confidence=confidence - 10,  # Slightly lower confidence
                notes=f"Auto-generated from user categorization"
            )
            
            # Check if similar rule already exists
            existing = (
                db.query(CategorizationRule)
                .filter(
                    and_(
                        CategorizationRule.user_id == user_id,
                        CategorizationRule.pattern == description_rule.pattern,
                        CategorizationRule.field_to_match == description_rule.field_to_match,
                        CategorizationRule.is_active == True
                    )
                )
                .first()
            )
            
            if not existing:
                created_rule = self.create_for_user(db, obj_in=description_rule, user_id=user_id)
                created_rules.append(created_rule)
        
        return created_rules
    
    def delete_for_user(
        self, 
        db: Session, 
        *, 
        rule_id: Any, 
        user_id: Any
    ) -> bool:
        """Delete a categorization rule (only if owned by user)"""
        rule = (
            db.query(CategorizationRule)
            .filter(
                and_(
                    CategorizationRule.id == rule_id,
                    CategorizationRule.user_id == user_id
                )
            )
            .first()
        )
        
        if rule:
            db.delete(rule)
            db.commit()
            return True
        return False
    
    def get_usage_stats(
        self, 
        db: Session, 
        *, 
        user_id: Any
    ) -> Dict[str, Any]:
        """Get usage statistics for user's categorization rules"""
        from sqlalchemy import func
        
        stats = (
            db.query(
                func.count(CategorizationRule.id).label("total_rules"),
                func.count(CategorizationRule.id).filter(CategorizationRule.is_active == True).label("active_rules"),
                func.sum(CategorizationRule.times_applied).label("total_applications"),
                func.avg(CategorizationRule.confidence).label("avg_confidence")
            )
            .filter(CategorizationRule.user_id == user_id)
            .first()
        )
        
        return {
            "total_rules": stats.total_rules or 0,
            "active_rules": stats.active_rules or 0,
            "total_applications": int(stats.total_applications or 0),
            "average_confidence": float(stats.avg_confidence or 0)
        }


# Create instance
categorization_rule_crud = CRUDCategorizationRule(CategorizationRule)
