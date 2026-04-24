-- 1. Games Table (The Catalog)
CREATE TABLE games (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    platform VARCHAR(10), -- 'PS4' or 'PS5'
    image_url TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Game Accounts (The Inventory/Stock)
-- This stores the actual login details you will send manually
CREATE TABLE game_accounts (
    id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES games(id),
    email TEXT NOT NULL,
    password TEXT NOT NULL,
    two_fa_code TEXT, -- Optional field for 2FA
    is_sold BOOLEAN DEFAULT FALSE,
    sold_to_user_id UUID, -- Links to the buyer once sold
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Orders Table (The Transaction Record)
-- This is where you track the MMQR screenshots
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    game_id INTEGER REFERENCES games(id),
    amount_paid DECIMAL(10, 2),
    payment_screenshot_url TEXT, -- Link to the image they upload
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'verified', 'delivered'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);