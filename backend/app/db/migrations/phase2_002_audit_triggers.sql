-- Audit Trigger Function
-- Automatically logs all INSERT, UPDATE, DELETE operations

CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id VARCHAR(255);
    current_company_id INTEGER;
BEGIN
    -- Get current user from app setting (set by middleware)
    current_user_id := current_setting('app.current_user', true);
    current_company_id := current_setting('app.current_company', true)::INTEGER;
    
    -- Default values if not set
    IF current_user_id IS NULL THEN
        current_user_id := 'system';
    END IF;
    
    IF current_company_id IS NULL THEN
        current_company_id := 1;
    END IF;
    
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (company_id, user_id, action, table_name, record_id, new_values, created_at)
        VALUES (current_company_id, current_user_id, 'INSERT', TG_TABLE_NAME, NEW.id, to_jsonb(NEW), NOW());
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (company_id, user_id, action, table_name, record_id, old_values, new_values, created_at)
        VALUES (current_company_id, current_user_id, 'UPDATE', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW), NOW());
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (company_id, user_id, action, table_name, record_id, old_values, created_at)
        VALUES (current_company_id, current_user_id, 'DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD), NOW());
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to key tables (Phase 2)
CREATE TRIGGER audit_roles
    AFTER INSERT OR UPDATE OR DELETE ON roles
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_user_roles
    AFTER INSERT OR UPDATE OR DELETE ON user_roles
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_branches
    AFTER INSERT OR UPDATE OR DELETE ON branches
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_approval_workflows
    AFTER INSERT OR UPDATE OR DELETE ON approval_workflows
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_approval_requests
    AFTER INSERT OR UPDATE OR DELETE ON approval_requests
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_budgets
    AFTER INSERT OR UPDATE OR DELETE ON budgets
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_budget_lines
    AFTER INSERT OR UPDATE OR DELETE ON budget_lines
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_bom_headers
    AFTER INSERT OR UPDATE OR DELETE ON bom_headers
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_bom_lines
    AFTER INSERT OR UPDATE OR DELETE ON bom_lines
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_production_orders
    AFTER INSERT OR UPDATE OR DELETE ON production_orders
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

COMMENT ON FUNCTION audit_trigger_function() IS 'Automatically logs all data changes to audit_logs table';
