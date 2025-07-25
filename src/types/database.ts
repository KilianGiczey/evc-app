// Database types for the new project
// Add your database schema types here as needed

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      generation_data: {
        Row: {
          id: string;
          project_id: string;
          system_size_kwp: number;
          panel_type: 'monocrystalline' | 'polycrystalline' | 'thin-film';
          orientation: 'N' | 'E' | 'S' | 'W' | 'NE' | 'SE' | 'SW' | 'NW';
          tilt: number;
          system_losses: number;
          annual_degradation: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          system_size_kwp: number;
          panel_type: 'monocrystalline' | 'polycrystalline' | 'thin-film';
          orientation: 'N' | 'E' | 'S' | 'W' | 'NE' | 'SE' | 'SW' | 'NW';
          tilt: number;
          system_losses: number;
          annual_degradation: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          system_size_kwp?: number;
          panel_type?: 'monocrystalline' | 'polycrystalline' | 'thin-film';
          orientation?: 'N' | 'E' | 'S' | 'W' | 'NE' | 'SE' | 'SW' | 'NW';
          tilt?: number;
          system_losses?: number;
          annual_degradation?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      storage_data: {
        Row: {
          id: string;
          project_id: string;
          capacity_kwh: number;
          power_kw: number;
          battery_chemistry: 'Lithium-ion' | 'Lithium Iron Phosphate' | 'Lead Acid' | 'Nickel Cadmium';
          depth_of_discharge: number;
          round_trip_efficiency: number;
          annual_degradation: number;
          discharge_behaviour: string;
          discharge_time: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          capacity_kwh: number;
          power_kw: number;
          battery_chemistry: 'Lithium-ion' | 'Lithium Iron Phosphate' | 'Lead Acid' | 'Nickel Cadmium';
          depth_of_discharge: number;
          round_trip_efficiency: number;
          annual_degradation: number;
          discharge_behaviour: string;
          discharge_time: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          capacity_kwh?: number;
          power_kw?: number;
          battery_chemistry?: 'Lithium-ion' | 'Lithium Iron Phosphate' | 'Lead Acid' | 'Nickel Cadmium';
          depth_of_discharge?: number;
          round_trip_efficiency?: number;
          annual_degradation?: number;
          discharge_behaviour?: string;
          discharge_time?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      grid_data: {
        Row: {
          id: string;
          project_id: string;
          max_import_kw: number;
          max_export_kw: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          max_import_kw: number;
          max_export_kw: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          max_import_kw?: number;
          max_export_kw?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      charging_hubs: {
        Row: {
          id: string;
          project_id: string;
          hub_name: string;
          charger_power: number;
          number_of_chargers: number;
          priority: number;
          charging_profile_id: string | null;
          demand_profile_annual_demand: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          hub_name: string;
          charger_power: number;
          number_of_chargers: number;
          priority: number;
          charging_profile_id?: string | null;
          demand_profile_annual_demand?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          hub_name?: string;
          charger_power?: number;
          number_of_chargers?: number;
          priority?: number;
          charging_profile_id?: string | null;
          demand_profile_annual_demand?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      charging_profiles: {
        Row: {
          id: string;
          project_id: string;
          profile_name: string;
          initial_number_of_vehicles: number;
          average_charging_percentage: number;
          average_battery_size: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          profile_name: string;
          initial_number_of_vehicles: number;
          average_charging_percentage: number;
          average_battery_size: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          profile_name?: string;
          initial_number_of_vehicles?: number;
          average_charging_percentage?: number;
          average_battery_size?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      charging_profile_behaviour: {
        Row: {
          id: string;
          charging_profile_id: string;
          weekday_hourly_data: number[];
          weekend_hourly_data: number[];
          monthly_data: number[];
          weekday_weekend_scale: number;
          selected_profile: string;
          annual_growth_rates: number[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          charging_profile_id: string;
          weekday_hourly_data: number[];
          weekend_hourly_data: number[];
          monthly_data: number[];
          weekday_weekend_scale?: number;
          selected_profile?: string;
          annual_growth_rates?: number[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          charging_profile_id?: string;
          weekday_hourly_data?: number[];
          weekend_hourly_data?: number[];
          monthly_data?: number[];
          weekday_weekend_scale?: number;
          selected_profile?: string;
          annual_growth_rates?: number[];
          created_at?: string;
          updated_at?: string;
        };
      };
      tariffs_data: {
        Row: {
          id: string;
          project_id: string;
          energy_tariff_type: 'fixed' | 'variable' | 'custom';
          energy_fixed_price: number | null;
          energy_variable_prices: any | null; // JSONB
          energy_custom_periods: any | null; // JSONB
          network_tariff_type: string | null;
          contracted_power_margin_percent: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          energy_tariff_type: 'fixed' | 'variable' | 'custom';
          energy_fixed_price?: number | null;
          energy_variable_prices?: any | null;
          energy_custom_periods?: any | null;
          network_tariff_type?: string | null;
          contracted_power_margin_percent?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          energy_tariff_type?: 'fixed' | 'variable' | 'custom';
          energy_fixed_price?: number | null;
          energy_variable_prices?: any | null;
          energy_custom_periods?: any | null;
          network_tariff_type?: string | null;
          contracted_power_margin_percent?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      energy_forecasts: {
        Row: {
          id: string;
          project_id: string;
          generated_solar_energy: any;
          gross_energy_demand: any;
          generated_solar_energy_consumed: any;
          generated_solar_energy_excess_post_consumption: any;
          forecasted_solar_charging_energy: any;
          energy_demand_post_solar: any;
          battery_start_state_of_charge: any;
          battery_charge_from_solar: any;
          battery_charge_from_grid: any;
          battery_discharge: any;
          battery_end_state_of_charge: any;
          energy_demand_post_solar_battery: any;
          grid_import: any;
          energy_demand_post_solar_battery_grid: any;
          generated_solar_energy_excess_post_consumption_battery: any;
          grid_export: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          generated_solar_energy?: any;
          gross_energy_demand?: any;
          generated_solar_energy_consumed?: any;
          generated_solar_energy_excess_post_consumption?: any;
          forecasted_solar_charging_energy?: any;
          energy_demand_post_solar?: any;
          battery_start_state_of_charge?: any;
          battery_charge_from_solar?: any;
          battery_charge_from_grid?: any;
          battery_discharge?: any;
          battery_end_state_of_charge?: any;
          energy_demand_post_solar_battery?: any;
          grid_import?: any;
          energy_demand_post_solar_battery_grid?: any;
          generated_solar_energy_excess_post_consumption_battery?: any;
          grid_export?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          generated_solar_energy?: any;
          gross_energy_demand?: any;
          generated_solar_energy_consumed?: any;
          generated_solar_energy_excess_post_consumption?: any;
          forecasted_solar_charging_energy?: any;
          energy_demand_post_solar?: any;
          battery_start_state_of_charge?: any;
          battery_charge_from_solar?: any;
          battery_charge_from_grid?: any;
          battery_discharge?: any;
          battery_end_state_of_charge?: any;
          energy_demand_post_solar_battery?: any;
          grid_import?: any;
          energy_demand_post_solar_battery_grid?: any;
          generated_solar_energy_excess_post_consumption_battery?: any;
          grid_export?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
      costs_data: {
        Row: {
          id: string;
          project_id: string;
          cost_name: string;
          cost_type: 'Capex' | 'Opex';
          cost_subtype: string;
          charger_hub_id?: string | null;
          cost: number;
          cost_escalation?: number | null; // annual % cost increase, only for Opex
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          cost_name: string;
          cost_type: 'Capex' | 'Opex';
          cost_subtype: string;
          charger_hub_id?: string | null;
          cost: number;
          cost_escalation?: number | null; // annual % cost increase, only for Opex
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          cost_name?: string;
          cost_type?: 'Capex' | 'Opex';
          cost_subtype?: string;
          charger_hub_id?: string | null;
          cost?: number;
          cost_escalation?: number | null; // annual % cost increase, only for Opex
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
} 

export interface Project {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  // Add more fields as needed
}

export interface GenerationData {
  id?: string;
  project_id: string;
  system_size_kwp: number;
  panel_type: 'monocrystalline' | 'polycrystalline' | 'thin-film';
  orientation: 'N' | 'E' | 'S' | 'W' | 'NE' | 'SE' | 'SW' | 'NW';
  tilt: number;
  system_losses: number;
  annual_degradation: number;
  created_at?: string;
  updated_at?: string;
}

export interface StorageData {
  id?: string;
  project_id: string;
  capacity_kwh: number;
  power_kw: number;
  battery_chemistry: 'Lithium-ion' | 'Lithium Iron Phosphate' | 'Lead Acid' | 'Nickel Cadmium';
  depth_of_discharge: number;
  round_trip_efficiency: number;
  annual_degradation: number;
  discharge_behaviour: string; // 'Arbitrage Maximisation' | 'Set Discharge Time'
  discharge_time: number | null; // hour of day, only if Set Discharge Time
  created_at?: string;
  updated_at?: string;
}

export interface GridData {
  id?: string;
  project_id: string;
  max_import_kw: number;
  max_export_kw: number;
  created_at?: string;
  updated_at?: string;
} 

export interface ChargingHubData {
  id?: string;
  project_id: string;
  hub_name: string;
  charger_power: number;
  number_of_chargers: number;
  priority: number;
  charging_profile_id?: string | null;
  sales_tariff_id?: string | null;
  demand_profile_annual_demand?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface ChargingProfileData {
  id?: string;
  project_id: string;
  profile_name: string;
  initial_number_of_vehicles: number;
  average_charging_percentage: number;
  average_battery_size: number;
  created_at?: string;
  updated_at?: string;
}

export interface ChargingProfileBehaviourData {
  id?: string;
  charging_profile_id: string;
  weekday_hourly_data: number[];
  weekend_hourly_data: number[];
  monthly_data: number[];
  weekday_weekend_scale: number;
  selected_profile: string;
  annual_growth_rates: number[];
  created_at?: string;
  updated_at?: string;
} 

export interface EnergyForecast {
  id?: string;
  project_id: string;
  generated_solar_energy?: any;
  gross_energy_demand?: any;
  generated_solar_energy_consumed?: any;
  generated_solar_energy_excess_post_consumption?: any;
  forecasted_solar_charging_energy?: any;
  energy_demand_post_solar?: any;
  battery_start_state_of_charge?: any;
  battery_charge_from_solar?: any;
  battery_charge_from_grid?: any;
  battery_discharge?: any;
  battery_end_state_of_charge?: any;
  energy_demand_post_solar_battery?: any;
  grid_import?: any;
  energy_demand_post_solar_battery_grid?: any;
  generated_solar_energy_excess_post_consumption_battery?: any;
  grid_export?: any;
  created_at?: string;
  updated_at?: string;
} 

export interface CostsData {
  id: string;
  project_id: string;
  cost_name: string;
  cost_type: 'Capex' | 'Opex';
  cost_subtype: string;
  charger_hub_id?: string | null;
  cost: number;
  // cost_function: string; // removed
  cost_escalation?: number | null; // annual % cost increase, only for Opex
  created_at: string;
  updated_at: string;
} 