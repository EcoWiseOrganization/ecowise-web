"use client";

import { useState } from "react";
import { createEventAction } from "@/app/actions/organization.actions";
import type { CreateEventInput } from "@/services/eventService";
import type { Event, EventType, EventStatus } from "@/types/database.types";

// ── Validation ───────────────────────────────────────────────────

export interface EventFormErrors {
  name?: string;
  event_type?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}

function validate(values: Omit<CreateEventInput, "org_id">): EventFormErrors {
  const errors: EventFormErrors = {};

  if (!values.name.trim()) {
    errors.name = "MSG01: Event name is required.";
  }
  if (!values.event_type) {
    errors.event_type = "MSG01: Please select an event type.";
  }
  if (!values.status) {
    errors.status = "MSG01: Please select an initial status.";
  }
  if (!values.start_date) {
    errors.start_date = "MSG01: Start date is required.";
  }
  if (!values.end_date) {
    errors.end_date = "MSG01: End date is required.";
  }

  // MSG22: end date must not be before start date
  if (values.start_date && values.end_date) {
    if (new Date(values.end_date) < new Date(values.start_date)) {
      errors.end_date =
        "MSG22: End date cannot be earlier than the start date. Please select a valid date range.";
    }
  }

  return errors;
}

// ── Hook ─────────────────────────────────────────────────────────

interface UseCreateEventReturn {
  loading: boolean;
  errors: EventFormErrors;
  generalError: string;
  handleSubmit: (
    values: CreateEventInput,
    userId: string,
    onSuccess?: (event: Event) => void
  ) => Promise<void>;
  clearErrors: () => void;
}

export function useCreateEvent(): UseCreateEventReturn {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<EventFormErrors>({});
  const [generalError, setGeneralError] = useState("");

  const clearErrors = () => {
    setErrors({});
    setGeneralError("");
  };

  const handleSubmit = async (
    values: CreateEventInput,
    _userId: string,
    onSuccess?: (event: Event) => void
  ) => {
    // 1. Client-side validation (includes MSG22)
    const { org_id, ...rest } = values;
    const validationErrors = validate(rest);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});
    setGeneralError("");

    // 2. Call Server Action — auth.uid() is always set server-side
    const { data: event, error: actionError } = await createEventAction(values);

    if (actionError || !event) {
      setGeneralError(actionError ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    // 3. Notify caller (show toast, close modal, etc.)
    onSuccess?.(event);
    setLoading(false);
  };

  return { loading, errors, generalError, handleSubmit, clearErrors };
}

// ── Constants used by the form UI ────────────────────────────────

export const EVENT_TYPE_OPTIONS: { value: EventType; label: string }[] = [
  { value: "Conference", label: "Conference" },
  { value: "Festival",   label: "Festival" },
  { value: "Webinar",    label: "Webinar" },
  { value: "Workshop",   label: "Workshop" },
  { value: "Other",      label: "Other" },
];

export const EVENT_STATUS_OPTIONS: { value: EventStatus; label: string }[] = [
  { value: "Active",    label: "Active" },
  { value: "Scheduled", label: "Scheduled" },
];
