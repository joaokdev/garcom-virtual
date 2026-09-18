"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { StarRating } from "@/components/ui/StarRating";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function FeedbackSheet({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      await onSubmit(rating, comment.trim());
      setRating(0);
      setComment("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title={t("feedback.title")}
      closeLabel={t("common.close")}
      footer={
        <div className="space-y-2">
          <Button variant="primary" size="lg" fullWidth disabled={rating === 0} loading={submitting} onClick={handleSubmit}>
            {t("feedback.submit")}
          </Button>
          <Button variant="ghost" size="md" fullWidth onClick={onClose}>
            {t("feedback.skip")}
          </Button>
        </div>
      }
    >
      <div className="space-y-6 py-2">
        <p className="text-center text-sm text-ink-soft">{t("feedback.subtitle")}</p>
        <StarRating value={rating} onChange={setRating} label={t("feedback.ratingLabel")} />
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t("feedback.commentPlaceholder")}
          rows={3}
          maxLength={1000}
          className="w-full resize-none rounded-[var(--radius-lg)] border border-line bg-paper px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-ink"
        />
      </div>
    </Sheet>
  );
}
