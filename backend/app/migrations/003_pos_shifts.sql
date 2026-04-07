-- POS Shift Management & Hold Transactions
-- Date: 2026-04-07

-- POS Shifts Table
CREATE TABLE IF NOT EXISTS pos_shifts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shift_number VARCHAR(50) NOT NULL UNIQUE,
    company_id UUID NOT NULL REFERENCES companies(id),
    cashier_id UUID NOT NULL REFERENCES users(id),
    cashier_name VARCHAR(255) NOT NULL,
    opening_cash DECIMAL(15, 2) NOT NULL DEFAULT 0,
    expected_cash DECIMAL(15, 2) NOT NULL DEFAULT 0,
    actual_cash DECIMAL(15, 2) NOT NULL DEFAULT 0,
    difference DECIMAL(15, 2) NOT NULL DEFAULT 0,
    total_sales INTEGER NOT NULL DEFAULT 0,
    total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- POS Held Transactions Table
CREATE TABLE IF NOT EXISTS pos_held_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    hold_number VARCHAR(50) NOT NULL,
    company_id UUID NOT NULL REFERENCES companies(id),
    held_by UUID NOT NULL REFERENCES users(id),
    items JSONB NOT NULL DEFAULT '[]',
    customer_id UUID REFERENCES customers(id),
    customer_name VARCHAR(255),
    discount DECIMAL(15, 2) DEFAULT 0,
    hold_date VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'held' CHECK (status IN ('held', 'resumed', 'completed', 'cancelled')),
    held_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resumed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pos_shifts_company ON pos_shifts(company_id);
CREATE INDEX IF NOT EXISTS idx_pos_shifts_cashier ON pos_shifts(cashier_id);
CREATE INDEX IF NOT EXISTS idx_pos_shifts_status ON pos_shifts(status);
CREATE INDEX IF NOT EXISTS idx_pos_shifts_opened_at ON pos_shifts(opened_at);

CREATE INDEX IF NOT EXISTS idx_pos_held_company ON pos_held_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_pos_held_date ON pos_held_transactions(hold_date);
CREATE INDEX IF NOT EXISTS idx_pos_held_status ON pos_held_transactions(status);
