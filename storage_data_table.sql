-- Create storage_data table
CREATE TABLE storage_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    capacity_kwh DECIMAL(10,2) NOT NULL,
    power_kw DECIMAL(10,2) NOT NULL,
    battery_chemistry TEXT NOT NULL CHECK (battery_chemistry IN ('Lithium-ion', 'Lithium Iron Phosphate', 'Lead Acid', 'Nickel Cadmium')),
    depth_of_discharge DECIMAL(5,2) NOT NULL CHECK (depth_of_discharge >= 0 AND depth_of_discharge <= 100),
    round_trip_efficiency DECIMAL(5,2) NOT NULL CHECK (round_trip_efficiency >= 0 AND round_trip_efficiency <= 100),
    annual_degradation DECIMAL(4,2) NOT NULL DEFAULT 2.5 CHECK (annual_degradation >= 0 AND annual_degradation <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint to ensure one storage configuration per project
CREATE UNIQUE INDEX storage_data_project_id_idx ON storage_data (project_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_storage_data_updated_at 
    BEFORE UPDATE ON storage_data 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE storage_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (adjust these based on your authentication setup)
-- Example policy for authenticated users to manage their own project data
CREATE POLICY "Users can manage storage data for their own projects" ON storage_data
    FOR ALL USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE id = storage_data.project_id
            -- Add your user authentication condition here
            -- For example: AND user_id = auth.uid()
        )
    ); 