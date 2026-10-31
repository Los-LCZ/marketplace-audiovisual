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
/**
 * requested: espera aprobación del anfitrión (no bloquea el horario).
 * rejected: el anfitrión rechazó la solicitud.
 */
export type BookingStatus =
  | "requested"
  | "pending_payment"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "rejected";
export type AmenityCategory = "audio" | "video" | "general";
export type ReactionKind = "like" | "pass";
export type GearCategory = "microfonos" | "consolas" | "amplificacion" | "iluminacion";
/** Equipamiento técnico del espacio, agrupado por categoría (columna `spaces.gear`). */
export type GearGroup = { category: GearCategory; items: string[] };

/** Resumen de calificaciones en un rol (solo reseñas reveladas). */
export type RatingSummary = {
  /** Promedio con 2 decimales; null si no hay reseñas. */
  avg: number | null;
  count: number;
  /** Cantidad de reseñas con 5, 4, 3, 2 y 1 estrellas (en ese orden). */
  distribution: [number, number, number, number, number];
  /** Hasta 5 etiquetas más repetidas. */
  top_tags: { label: string; count: number }[];
};

export type ProfileRatingStats = { as_host: RatingSummary; as_client: RatingSummary };

export type ProfileReviewRole = "host" | "client";

/** Cliente visto por un anfitrión: perfil público, nota como cliente y última reseña recibida. */
export type ClientSummaryRow = {
  client_id: string;
  full_name: string | null;
  avatar_url: string | null;
  verified: boolean;
  /** Promedio (2 decimales) de reseñas reveladas; null si no tiene. */
  avg_rating: number | null;
  review_count: number;
  last_review: { rating: number; comment: string | null; tags: string[]; created_at: string } | null;
};

/** Una reseña tal como la devuelve get_booking_reviews. */
export type BookingReviewEntry = {
  id: string;
  rating: number;
  comment: string | null;
  tags: string[];
  created_at: string;
};

/**
 * Reseñas de una reserva vistas por el usuario actual (calificación a ciegas):
 * la de la contraparte es null hasta que `revealed` sea true.
 */
export type BookingReviews = {
  role: "client" | "host" | "admin";
  /** Ambas partes enviaron su reseña o pasaron 14 días desde que se completó. */
  revealed: boolean;
  /** Cuándo se revelan por plazo (null si la reserva no está completada). */
  reveal_at: string | null;
  space_review_submitted: boolean;
  client_review_submitted: boolean;
  /** Del cliente sobre el espacio/anfitrión (tabla reviews). */
  space_review: BookingReviewEntry | null;
  /** Del anfitrión sobre el cliente (tabla client_reviews). */
  client_review: BookingReviewEntry | null;
};

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
          headline: string | null;
          bio: string | null;
          commune: string | null;
          tags: string[];
          /** Solo lo cambia un admin. */
          verified: boolean;
          /** Nota mínima (1–5) que el anfitrión exige para confirmar sin aprobación; null = cualquiera. */
          min_client_rating: number | null;
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
          headline?: string | null;
          bio?: string | null;
          commune?: string | null;
          tags?: string[];
          verified?: boolean;
          min_client_rating?: number | null;
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
          /** Lo fija la base al pasar a completed; inicia el plazo de 14 días de la calificación. */
          completed_at: string | null;
          project: string | null;
          message: string | null;
          /** Cuándo el anfitrión aceptó o rechazó la solicitud. */
          decided_at: string | null;
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
          project?: string | null;
          message?: string | null;
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
          tags: string[];
        };
        Insert: {
          id?: string;
          booking_id: string;
          rating: number;
          comment?: string | null;
          created_at?: string;
          tags?: string[];
        };
        Update: {
          rating?: number;
          comment?: string | null;
          tags?: string[];
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
      /** Calificación que el anfitrión hace del cliente (una por reserva completada). */
      client_reviews: {
        Row: {
          id: string;
          booking_id: string;
          rating: number;
          comment: string | null;
          tags: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          rating: number;
          comment?: string | null;
          tags?: string[];
          created_at?: string;
        };
        Update: {
          rating?: number;
          comment?: string | null;
          tags?: string[];
        };
        Relationships: [
          {
            foreignKeyName: "client_reviews_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: true;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };
      /** Me gusta / descarte de un usuario sobre un espacio (Descubrir). */
      space_reactions: {
        Row: { user_id: string; space_id: string; kind: ReactionKind; created_at: string };
        Insert: { user_id?: string; space_id: string; kind: ReactionKind; created_at?: string };
        Update: { kind?: ReactionKind; created_at?: string };
        Relationships: [
          {
            foreignKeyName: "space_reactions_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "spaces";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      /** Perfil público (sin teléfono). */
      public_profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          role: UserRole;
          created_at: string;
          headline: string | null;
          bio: string | null;
          commune: string | null;
          tags: string[];
          verified: boolean;
          min_client_rating: number | null;
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
      get_profile_rating_stats: {
        Args: { p_profile_id: string };
        Returns: ProfileRatingStats;
      };
      get_profile_reviews: {
        Args: { p_profile_id: string; p_role: ProfileReviewRole; p_page?: number; p_page_size?: number };
        Returns: {
          id: string;
          rating: number;
          comment: string | null;
          tags: string[];
          created_at: string;
          author_id: string;
          author_name: string | null;
          author_avatar: string | null;
          space_id: string;
          space_title: string;
        }[];
      };
      get_client_summaries: {
        Args: { p_client_ids: string[] };
        Returns: ClientSummaryRow[];
      };
      reset_passes: {
        Args: { p_categories?: SpaceCategory[] | null };
        Returns: number;
      };
      get_discover_deck: {
        Args: { p_categories?: SpaceCategory[] | null; p_limit?: number };
        Returns: {
          space_id: string;
          is_match: boolean;
          host_min_client_rating: number | null;
          my_client_rating: number | null;
        }[];
      };
      get_bookings_reviews: {
        Args: { p_booking_ids: string[] };
        Returns: { booking_id: string; reviews: BookingReviews }[];
      };
      get_booking_reviews: {
        Args: { p_booking_id: string };
        Returns: BookingReviews | null;
      };
      get_client_rating: {
        Args: { p_profile_id: string };
        Returns: { avg_rating: number | null; review_count: number }[];
      };
      list_communes: {
        Args: Record<string, never>;
        Returns: { commune: string; space_count: number }[];
      };
      get_category_stats: {
        Args: Record<string, never>;
        Returns: { category: SpaceCategory; space_count: number; min_price: number }[];
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
export type ClientReview = Tables<"client_reviews">;
export type PublicProfile = PublicSchema["Views"]["public_profiles"]["Row"];
export type SpaceRatingStats = PublicSchema["Views"]["space_rating_stats"]["Row"];
export type ProfileReview = PublicSchema["Functions"]["get_profile_reviews"]["Returns"][number];
export type CommuneCount = PublicSchema["Functions"]["list_communes"]["Returns"][number];
export type SpaceReview = PublicSchema["Functions"]["get_space_reviews"]["Returns"][number];
