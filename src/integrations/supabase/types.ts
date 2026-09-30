export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      collab_agreement_messages: {
        Row: {
          agreement_id: string
          content: string
          created_at: string
          for_user_id: string | null
          id: string
          message_type: string
          metadata: Json | null
          question_options: Json | null
          selected_option: string | null
          sender_id: string | null
          sender_role: string
        }
        Insert: {
          agreement_id: string
          content: string
          created_at?: string
          for_user_id?: string | null
          id?: string
          message_type?: string
          metadata?: Json | null
          question_options?: Json | null
          selected_option?: string | null
          sender_id?: string | null
          sender_role: string
        }
        Update: {
          agreement_id?: string
          content?: string
          created_at?: string
          for_user_id?: string | null
          id?: string
          message_type?: string
          metadata?: Json | null
          question_options?: Json | null
          selected_option?: string | null
          sender_id?: string | null
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "collab_agreement_messages_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "collab_agreements"
            referencedColumns: ["id"]
          },
        ]
      }
      collab_agreements: {
        Row: {
          accepted_by_a: boolean
          accepted_by_b: boolean
          agreement_document: string | null
          agreement_summary: Json | null
          conversation_id: string
          created_at: string
          id: string
          intent_a: string | null
          intent_b: string | null
          intent_translated_a: string | null
          intent_translated_b: string | null
          questions_asked_a: number
          questions_asked_b: number
          status: Database["public"]["Enums"]["collab_agreement_status"]
          updated_at: string
          user_a: string
          user_a_role: string | null
          user_b: string
          user_b_role: string | null
        }
        Insert: {
          accepted_by_a?: boolean
          accepted_by_b?: boolean
          agreement_document?: string | null
          agreement_summary?: Json | null
          conversation_id: string
          created_at?: string
          id?: string
          intent_a?: string | null
          intent_b?: string | null
          intent_translated_a?: string | null
          intent_translated_b?: string | null
          questions_asked_a?: number
          questions_asked_b?: number
          status?: Database["public"]["Enums"]["collab_agreement_status"]
          updated_at?: string
          user_a: string
          user_a_role?: string | null
          user_b: string
          user_b_role?: string | null
        }
        Update: {
          accepted_by_a?: boolean
          accepted_by_b?: boolean
          agreement_document?: string | null
          agreement_summary?: Json | null
          conversation_id?: string
          created_at?: string
          id?: string
          intent_a?: string | null
          intent_b?: string | null
          intent_translated_a?: string | null
          intent_translated_b?: string | null
          questions_asked_a?: number
          questions_asked_b?: number
          status?: Database["public"]["Enums"]["collab_agreement_status"]
          updated_at?: string
          user_a?: string
          user_a_role?: string | null
          user_b?: string
          user_b_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collab_agreements_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      collab_comments: {
        Row: {
          collab_id: string
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          collab_id: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          collab_id?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collab_comments_collab_id_fkey"
            columns: ["collab_id"]
            isOneToOne: false
            referencedRelation: "collaborations"
            referencedColumns: ["id"]
          },
        ]
      }
      collab_likes: {
        Row: {
          collab_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          collab_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          collab_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collab_likes_collab_id_fkey"
            columns: ["collab_id"]
            isOneToOne: false
            referencedRelation: "collaborations"
            referencedColumns: ["id"]
          },
        ]
      }
      collaboration_participants: {
        Row: {
          collab_id: string
          created_at: string
          role: string | null
          user_id: string
        }
        Insert: {
          collab_id: string
          created_at?: string
          role?: string | null
          user_id: string
        }
        Update: {
          collab_id?: string
          created_at?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_participants_collab_id_fkey"
            columns: ["collab_id"]
            isOneToOne: false
            referencedRelation: "collaborations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaboration_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborations: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          instagram_url: string | null
          owner_id: string
          soundcloud_url: string | null
          spotify_url: string | null
          title: string
          updated_at: string
          youtube_url: string | null
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          instagram_url?: string | null
          owner_id: string
          soundcloud_url?: string | null
          spotify_url?: string | null
          title: string
          updated_at?: string
          youtube_url?: string | null
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          instagram_url?: string | null
          owner_id?: string
          soundcloud_url?: string | null
          spotify_url?: string | null
          title?: string
          updated_at?: string
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collaborations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          match_id: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          match_id: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          match_id?: string
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          created_at: string
          id: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_user_a_fkey"
            columns: ["user_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_user_b_fkey"
            columns: ["user_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          entity_id: string | null
          id: string
          read_at: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          id?: string
          read_at?: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          id?: string
          read_at?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          country: string | null
          created_at: string
          discipline: Database["public"]["Enums"]["discipline_type"] | null
          display_name: string | null
          experience_level:
            | Database["public"]["Enums"]["experience_level"]
            | null
          genres: string[] | null
          id: string
          instagram_url: string | null
          is_verified: boolean
          looking_for: Database["public"]["Enums"]["discipline_type"][] | null
          notification_prefs: Json
          onboarding_completed: boolean
          skills: string[] | null
          soundcloud_url: string | null
          spotify_url: string | null
          updated_at: string
          username: string | null
          verified_at: string | null
          website_url: string | null
          years_active: number | null
          youtube_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          discipline?: Database["public"]["Enums"]["discipline_type"] | null
          display_name?: string | null
          experience_level?:
            | Database["public"]["Enums"]["experience_level"]
            | null
          genres?: string[] | null
          id: string
          instagram_url?: string | null
          is_verified?: boolean
          looking_for?: Database["public"]["Enums"]["discipline_type"][] | null
          notification_prefs?: Json
          onboarding_completed?: boolean
          skills?: string[] | null
          soundcloud_url?: string | null
          spotify_url?: string | null
          updated_at?: string
          username?: string | null
          verified_at?: string | null
          website_url?: string | null
          years_active?: number | null
          youtube_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          discipline?: Database["public"]["Enums"]["discipline_type"] | null
          display_name?: string | null
          experience_level?:
            | Database["public"]["Enums"]["experience_level"]
            | null
          genres?: string[] | null
          id?: string
          instagram_url?: string | null
          is_verified?: boolean
          looking_for?: Database["public"]["Enums"]["discipline_type"][] | null
          notification_prefs?: Json
          onboarding_completed?: boolean
          skills?: string[] | null
          soundcloud_url?: string | null
          spotify_url?: string | null
          updated_at?: string
          username?: string | null
          verified_at?: string | null
          website_url?: string | null
          years_active?: number | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reported_user_id: string
          reporter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: Database["public"]["Enums"]["report_reason"]
          reported_user_id: string
          reporter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reported_user_id?: string
          reporter_id?: string
          status?: string
        }
        Relationships: []
      }
      swipes: {
        Row: {
          created_at: string
          direction: Database["public"]["Enums"]["swipe_direction"]
          id: string
          swiped_id: string
          swiper_id: string
        }
        Insert: {
          created_at?: string
          direction: Database["public"]["Enums"]["swipe_direction"]
          id?: string
          swiped_id: string
          swiper_id: string
        }
        Update: {
          created_at?: string
          direction?: Database["public"]["Enums"]["swipe_direction"]
          id?: string
          swiped_id?: string
          swiper_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "swipes_swiped_id_fkey"
            columns: ["swiped_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swipes_swiper_id_fkey"
            columns: ["swiper_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_requests: {
        Row: {
          created_at: string
          evidence_url: string | null
          id: string
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["verification_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          evidence_url?: string | null
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          evidence_url?: string | null
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_match_count: { Args: { _user_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_blocked_between: { Args: { _a: string; _b: string }; Returns: boolean }
      is_conversation_member: {
        Args: { _conv_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      collab_agreement_status:
        | "in_progress"
        | "pending_acceptance"
        | "accepted"
        | "renegotiating"
      discipline_type:
        | "producer"
        | "musician"
        | "singer"
        | "dancer"
        | "other"
        | "designer"
        | "sound_engineer"
        | "manager"
        | "songwriter"
        | "videographer"
        | "photographer"
        | "promoter"
        | "journalist"
        | "teacher"
      experience_level: "beginner" | "intermediate" | "pro"
      notification_type: "like" | "match" | "collab_tag" | "message"
      report_reason: "spam" | "inappropriate" | "fake" | "harassment" | "other"
      swipe_direction: "like" | "pass"
      verification_status: "pending" | "approved" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      collab_agreement_status: [
        "in_progress",
        "pending_acceptance",
        "accepted",
        "renegotiating",
      ],
      discipline_type: [
        "producer",
        "musician",
        "singer",
        "dancer",
        "other",
        "designer",
        "sound_engineer",
        "manager",
        "songwriter",
        "videographer",
        "photographer",
        "promoter",
        "journalist",
        "teacher",
      ],
      experience_level: ["beginner", "intermediate", "pro"],
      notification_type: ["like", "match", "collab_tag", "message"],
      report_reason: ["spam", "inappropriate", "fake", "harassment", "other"],
      swipe_direction: ["like", "pass"],
      verification_status: ["pending", "approved", "rejected"],
    },
  },
} as const
