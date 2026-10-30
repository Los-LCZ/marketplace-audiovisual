// Tipos del esquema definido en supabase/migrations/init.sql.
// Se pueden regenerar con: npx supabase gen types typescript --project-id <id> > src/types/database.ts

export type UserRole = "client" | "host" | "admin";
export type SpaceCategory =
  | "recording_studio"
  | "rehearsal_room"
  | "filming_set"
  | "photo_studio"
  | "outdoor_location";
export type SpaceStatus = "draft" | "published" | "archived";
export type BookingStatus = "pending_payment" | "confirmed" | "completed" | "cancelled";
export type AmenityCategory = "audio" | "video" | "general";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          created_at?: string;
        };
        Update: {
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
        };
        Relationships: [];
      };
      spaces: {
        Row: {
          id: string;
          host_id: string;
          title: string;
          category: SpaceCategory;
          description: string | null;
          address: string;
          city: string;
          commune: string;
          price_per_hour: number;
          min_hours: number;
          images: string[];
          status: SpaceStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          host_id: string;
          title: string;
          category: SpaceCategory;
          description?: string | null;
          address: string;
          city: string;
          commune: string;
          price_per_hour: number;
          min_hours?: number;
          images?: string[];
          status?: SpaceStatus;
          created_at?: string;
        };
        Update: {
          title?: string;
          category?: SpaceCategory;
          description?: string | null;
          address?: string;
          city?: string;
          commune?: string;
          price_per_hour?: number;
          min_hours?: number;
          images?: string[];
          status?: SpaceStatus;
        };
        Relationships: [
          {
            foreignKeyName: "spaces_host_id_fkey";
            columns: ["host_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      amenities: {
        Row: { id: number; name: string; category: AmenityCategory };
        Insert: { id?: number; name: string; category: AmenityCategory };
        Update: { name?: string; category?: AmenityCategory };
        Relationships: [];
      };
      space_amenities: {
        Row: { space_id: string; amenity_id: number };
        Insert: { space_id: string; amenity_id: number };
        Update: { space_id?: string; amenity_id?: number };
        Relationships: [
          {
            foreignKeyName: "space_amenities_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "spaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "space_amenities_amenity_id_fkey";
            columns: ["amenity_id"];
            isOneToOne: false;
            referencedRelation: "amenities";
            referencedColumns: ["id"];
          },
        ];
      };
      bookings: {
        Row: {
          id: string;
          space_id: string;
          client_id: string;
          start_time: string;
          end_time: string;
          total_hours: number;
          subtotal: number;
          platform_fee: number;
          total_amount: number;
          status: BookingStatus;
          payment_id: string | null;
          created_at: string;
        };
        // Los montos los calcula el trigger compute_booking_amounts; se envían en 0.
        Insert: {
          id?: string;
          space_id: string;
          client_id: string;
          start_time: string;
          end_time: string;
          total_hours?: number;
          subtotal?: number;
          platform_fee?: number;
          total_amount?: number;
          status?: BookingStatus;
          payment_id?: string | null;
          created_at?: string;
        };
        Update: {
          status?: BookingStatus;
          payment_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "spaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          id: string;
          booking_id: string;
          rating: number;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          rating: number;
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          rating?: number;
          comment?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: true;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      public_profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          role: UserRole;
          created_at: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      get_space_busy_slots: {
        Args: { p_space_id: string; p_from: string; p_to: string };
        Returns: { start_time: string; end_time: string }[];
      };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_host: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      user_role: UserRole;
      space_category: SpaceCategory;
      space_status: SpaceStatus;
      booking_status: BookingStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];

export type Profile = Tables<"profiles">;
export type Space = Tables<"spaces">;
export type Amenity = Tables<"amenities">;
export type Booking = Tables<"bookings">;
export type Review = Tables<"reviews">;
export type PublicProfile = PublicSchema["Views"]["public_profiles"]["Row"];
