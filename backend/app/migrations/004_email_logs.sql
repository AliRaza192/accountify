-- Migration: 004_email_logs.sql
-- Description: Create email_logs table for tracking email delivery
-- Created: 2026-04-07

-- ==================== EMAIL LOGS TABLE ====================

CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,

    -- Email metadata
    email_type VARCHAR(50) NOT NULL DEFAULT 'custom'
        CHECK (email_type IN (
            'invoice', 'payment_reminder', 'salary_slip',
            'account_statement', 'approval_request', 'otp',
            'budget_alert', 'custom'
        )),
    recipient VARCHAR(500) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),

    -- Tracking
    reference_id UUID,  -- e.g. invoice_id, employee_id
    attachments_count INTEGER NOT NULL DEFAULT 0 CHECK (attachments_count >= 0),
    attempts INTEGER NOT NULL DEFAULT 1 CHECK (attempts >= 1),

    -- Timestamps
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Error tracking
    error_message TEXT,
    last_error_at TIMESTAMPTZ
);

-- ==================== INDEXES ====================

CREATE INDEX IF NOT EXISTS idx_email_logs_company ON email_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_reference ON email_logs(reference_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_created ON email_logs(created_at);

-- ==================== ROW LEVEL SECURITY ====================

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Users can only view email logs from their own company
CREATE POLICY "Users can view own company email logs" ON email_logs
    FOR SELECT USING (company_id = current_setting('app.current_company')::uuid);

CREATE POLICY "System can insert email logs" ON email_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update email logs" ON email_logs
    FOR UPDATE USING (true);

-- ==================== COMMENTS ====================

COMMENT ON TABLE email_logs IS 'Tracks all outgoing emails sent by the system for delivery monitoring and auditing.';
COMMENT ON COLUMN email_logs.email_type IS 'Type of email: invoice, payment_reminder, salary_slip, account_statement, etc.';
COMMENT ON COLUMN email_logs.reference_id IS 'Related entity ID (invoice_id, employee_id, etc.) for contextual lookups.';
