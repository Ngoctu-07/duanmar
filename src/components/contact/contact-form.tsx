"use client";

import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  isEmailValid,
  isMessageValid,
  isNameValid,
  isPhoneValid,
  type ContactErrorKey,
  type ContactValues,
} from "@/lib/contact-validation";

const EMPTY: ContactValues = { fullName: "", email: "", phone: "", message: "" };

/** RHF validate: `true` when valid, otherwise a locale-agnostic error key. */
const rule =
  (check: (value: string) => boolean, invalidKey: ContactErrorKey) =>
  (value: string): true | ContactErrorKey => {
    if (value.trim() === "") return "required";
    return check(value) ? true : invalidKey;
  };

const nameRule = rule(isNameValid, "nameInvalid");
const emailRule = rule(isEmailValid, "emailInvalid");
const phoneRule = rule(isPhoneValid, "phoneInvalid");
const messageRule = rule(isMessageValid, "messageInvalid");

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}

function Field({ id, label, error, children }: FieldProps) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="mt-1.5">{children}</div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Contact form: React Hook Form state + shared lib validation, POSTs a JSON
 * payload to /api/contact. Never echoes submitted values back (no reflected
 * XSS surface); success resets the fields, failure keeps them intact.
 */
export function ContactForm() {
  const t = useTranslations("contact");
  const [submitError, setSubmitError] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactValues>({ defaultValues: EMPTY, mode: "onBlur" });

  const onSubmit = async (values: ContactValues) => {
    setSubmitError(false);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!response.ok) throw new Error(`contact ${response.status}`);
      reset(EMPTY);
      setSubmitted(true);
    } catch {
      setSubmitError(true);
    }
  };

  const message = (key: string | undefined) =>
    key ? t(`form.${key as ContactErrorKey}`) : undefined;

  return (
    <form
      data-testid="contact-form"
      noValidate
      aria-labelledby="contact-form-heading"
      onChangeCapture={() => setSubmitted(false)}
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
    >
      <h2
        id="contact-form-heading"
        className="font-heading border-b border-border pb-3 text-lg font-semibold text-foreground"
      >
        {t("formHeading")}
      </h2>
      <Field id="contact-name" label={t("form.nameLabel")} error={message(errors.fullName?.message)}>
        <Input
          id="contact-name"
          type="text"
          autoComplete="name"
          aria-invalid={Boolean(errors.fullName) || undefined}
          aria-describedby={errors.fullName ? "contact-name-error" : undefined}
          {...register("fullName", { validate: nameRule })}
        />
      </Field>

      <Field id="contact-email" label={t("form.emailLabel")} error={message(errors.email?.message)}>
        <Input
          id="contact-email"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email) || undefined}
          aria-describedby={errors.email ? "contact-email-error" : undefined}
          {...register("email", { validate: emailRule })}
        />
      </Field>

      <Field id="contact-phone" label={t("form.phoneLabel")} error={message(errors.phone?.message)}>
        <Input
          id="contact-phone"
          type="tel"
          autoComplete="tel"
          placeholder="+84 90 123 4567"
          aria-invalid={Boolean(errors.phone) || undefined}
          aria-describedby={errors.phone ? "contact-phone-error" : undefined}
          {...register("phone", { validate: phoneRule })}
        />
      </Field>

      <Field id="contact-message" label={t("form.messageLabel")} error={message(errors.message?.message)}>
        <Textarea
          id="contact-message"
          rows={5}
          aria-invalid={Boolean(errors.message) || undefined}
          aria-describedby={errors.message ? "contact-message-error" : undefined}
          {...register("message", { validate: messageRule })}
        />
      </Field>

      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? t("form.submitting") : t("form.submit")}
      </Button>

      {submitted && !submitError && (
        <p data-testid="contact-form-success" role="status" className="text-sm text-link">
          {t("form.success")}
        </p>
      )}
      {submitError && (
        <p data-testid="contact-form-error" role="alert" className="text-sm text-destructive">
          {t("form.failure")}
        </p>
      )}
    </form>
  );
}
