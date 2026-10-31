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
export type GearCategory = "microfonos" | "consolas" | "amplificacion" | "iluminacion";
/** Equipamiento técnico del espacio, agrupado por categoría (columna `spaces.gear`). */
export type GearGroup = { category: GearCategory; items: string[] };

type SpaceRow = {
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
  neighborhood: string | null;
  size_m2: number | null;
  capacity: number | null;
  /** Hora de apertura (0–23, hora de Chile). */
  open_hour: number;
  /** Hora de cierre (1–24, hora de Chile); siempre mayor que open_hour. */
  close_hour: number;
  summary: string | null;
  rules: string[];
  /** Solo lo cambia un admin. */
  featured: boolean;
  gear: GearGroup[];
};

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
        Row: SpaceRow;
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
          neighborhood?: string | null;
          size_m2?: number | null;
          capacity?: number | null;
          open_hour?: number;
          close_hour?: number;
          summary?: string | null;
          rules?: string[];
          featured?: boolean;
          gear?: GearGroup[];
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
          neighborhood?: string | null;
          size_m2?: number | null;
          capacity?: number | null;
          open_hour?: number;
          close_hour?: number;
          summary?: string | null;
          rules?: string[];
          featured?: boolean;
          gear?: GearGroup[];
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
      /** Espacios publicados con rating (solo reseñas públicas). Fuente del catálogo. */
      space_cards: {
        Row: SpaceRow & {
          avg_rating: number | null;
          review_count: number;
        };
        Relationships: [];
      };
      space_rating_stats: {
        Row: {
          space_id: string;
          /** null si el espacio no tiene reseñas. */
          avg_rating: number | null;
          review_count: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      get_space_busy_slots: {
        Args: { p_space_id: string; p_from: string; p_to: string };
        Returns: { start_time: string; end_time: string }[];
      };
      get_space_reviews: {
        Args: { p_space_id: string; p_limit?: number; p_offset?: number };
        Returns: {
          id: string;
          rating: number;
          comment: string | null;
          created_at: string;
          author_name: string | null;
          author_avatar: string | null;
        }[];
      };
      get_available_space_ids: {
        Args: { p_date: string; p_categories?: SpaceCategory[] | null };
        Returns: string[];
      };
      set_space_amenities: {
        Args: { p_space_id: string; p_amenity_ids: number[] };
        Returns: undefined;
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
export type SpaceRatingStats = PublicSchema["Views"]["space_rating_stats"]["Row"];
export type SpaceReview = PublicSchema["Functions"]["get_space_reviews"]["Returns"][number];
