"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { GovernanceProposalAction } from "@/lib/contractData";
import { ACTION_DESCRIPTIONS } from "@/lib/contractData";
import { isValidStellarAddress } from "@/lib/stellarAddress";
import { parseXlmToStroops, sanitizeXlmInput } from "@/lib/formatters";

interface CreateProposalModalProps {
  isOpen: boolean;
  isCreating?: boolean;
  isWalletConnected?: boolean;
  onClose: () => void;
  onCreate: (data: {
    title: string;
    description: string;
    action: GovernanceProposalAction;
    target: string;
    amount: bigint;
  }) => Promise<void>;
}

const FOCUSABLE_SELECTORS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusable(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS));
}

const ACTIONS: GovernanceProposalAction[] = [
  "Funding",
  "PolicyChange",
  "AddMember",
  "RemoveMember",
  "General",
];

interface FieldErrors {
  title?: string;
  description?: string;
  target?: string;
  amount?: string;
}

export function CreateProposalModal({
  isOpen,
  isCreating = false,
  isWalletConnected,
  onClose,
  onCreate,
}: CreateProposalModalProps) {
  const TITLE_MAX = 100;
  const DESCRIPTION_MAX = 500;
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [action, setAction] = useState<GovernanceProposalAction>("General");
  const [target, setTarget] = useState("");
  const [amount, setAmount] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const normalizedTarget = target.trim();
  const isTargetAddressValid = isValidStellarAddress(normalizedTarget);

  useEffect(() => {
    if (isOpen) {
      openerRef.current = document.activeElement;
      const focusable = getFocusable(dialogRef.current);
      focusable[0]?.focus();
    } else {
      (openerRef.current as HTMLElement | null)?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isCreating) {
        onClose();
        return;
      }

      if (event.key === "Tab") {
        const focusable = getFocusable(dialogRef.current);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;

        if (event.shiftKey) {
          if (document.activeElement === first) {
            event.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, isCreating, onClose]);

  const validateTitle = (value: string): string | undefined => {
    if (!value.trim()) {
      return "Proposal title is required";
    }
    return undefined;
  };

  const validateDescription = (value: string): string | undefined => {
    if (!value.trim()) {
      return "Proposal description is required";
    }
    return undefined;
  };

  const validateTarget = (value: string, actionType: GovernanceProposalAction): string | undefined => {
    if (actionType !== "Funding" && actionType !== "AddMember" && actionType !== "RemoveMember") {
      return undefined;
    }

    if (!value.trim()) {
      return `Target address is required for ${actionType} proposals`;
    }

    if (!isValidStellarAddress(value.trim())) {
      return "Enter a valid Stellar account or contract address";
    }

    return undefined;
  };

  const validateAmount = (value: string, actionType: GovernanceProposalAction): string | undefined => {
    if (actionType !== "Funding") {
      return undefined;
    }

    if (!value || Number(value) <= 0) {
      return "Amount must be greater than 0";
    }

    return undefined;
  };

  const handleFieldChange = (field: keyof FieldErrors, value: string, validator: (v: string) => string | undefined) => {
    const error = validator(value);
    setFieldErrors((prev) => ({
      ...prev,
      [field]: error,
    }));
  };

  const handleFieldBlur = (field: string) => {
    setTouched((prev) => ({
      ...prev,
      [field]: true,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Mark all fields as touched for validation display
    setTouched({
      title: true,
      description: true,
      target: true,
      amount: true,
    });

    if (isWalletConnected === false) {
      setSubmitError("Please connect your wallet first");
      return;
    }

    // Validate all fields
    const titleError = validateTitle(title);
    const descriptionError = validateDescription(description);
    const targetError = validateTarget(target, action);
    const amountError = validateAmount(amount, action);

    const newErrors: FieldErrors = {};
    if (titleError) newErrors.title = titleError;
    if (descriptionError) newErrors.description = descriptionError;
    if (targetError) newErrors.target = targetError;
    if (amountError) newErrors.amount = amountError;

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      return;
    }

    try {
      const amountBigInt = action === "Funding" ? parseXlmToStroops(amount) : BigInt(0);

      await onCreate({
        title: title.trim(),
        description: description.trim(),
        action,
        target: (action === "Funding" || action === "AddMember" || action === "RemoveMember")
          ? normalizedTarget
          : "",
        amount: amountBigInt,
      });

      setTitle("");
      setDescription("");
      setAction("General");
      setTarget("");
      setAmount("");
      setFieldErrors({});
      setTouched({});
      onClose();
    } catch (err: any) {
      setSubmitError(err.message || "Failed to create proposal");
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      role="presentation"
      onClick={() => {
        if (!isCreating) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md card max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-lg font-semibold text-white">
          Create Proposal
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Submit a proposal for your organization to vote on
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="title" className="block text-xs font-medium text-gray-300 mb-1">
              Proposal Title
            </label>
            <input
              id="title"
              type="text"
              placeholder="e.g., Increase Treasury Allocation"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                handleFieldChange("title", e.target.value, validateTitle);
              }}
              onBlur={() => handleFieldBlur("title")}
              disabled={isCreating}
              maxLength={TITLE_MAX}
              aria-describedby={touched.title && fieldErrors.title ? "title-error" : undefined}
              aria-invalid={touched.title && !!fieldErrors.title}
              className={`w-full bg-gray-900 border rounded px-3 py-2 text-sm text-white outline-none focus:border-primary-500 disabled:opacity-50 transition-colors ${
                touched.title && fieldErrors.title ? "border-red-500" : "border-stellar-border"
              }`}
            />
            {touched.title && fieldErrors.title && (
              <p id="title-error" className="text-xs text-red-400 mt-1">{fieldErrors.title}</p>
            )}
            <p className="text-xs text-gray-500 text-right mt-1">{title.length}/{TITLE_MAX}</p>
          </div>

          <div>
            <label htmlFor="description" className="block text-xs font-medium text-gray-300 mb-1">
              Description
            </label>
            <textarea
              id="description"
              placeholder="Explain the purpose and details of this proposal"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                handleFieldChange("description", e.target.value, validateDescription);
              }}
              onBlur={() => handleFieldBlur("description")}
              disabled={isCreating}
              rows={3}
              maxLength={DESCRIPTION_MAX}
              aria-describedby={touched.description && fieldErrors.description ? "description-error" : undefined}
              aria-invalid={touched.description && !!fieldErrors.description}
              className={`w-full bg-gray-900 border rounded px-3 py-2 text-sm text-white outline-none focus:border-primary-500 disabled:opacity-50 resize-none transition-colors ${
                touched.description && fieldErrors.description ? "border-red-500" : "border-stellar-border"
              }`}
            />
            {touched.description && fieldErrors.description && (
              <p id="description-error" className="text-xs text-red-400 mt-1">{fieldErrors.description}</p>
            )}
            <p className="text-xs text-gray-500 text-right mt-1">{description.length}/{DESCRIPTION_MAX}</p>
          </div>

          <div>
            <label htmlFor="action" className="block text-xs font-medium text-gray-300 mb-1">
              Action Type
            </label>
            <select
              id="action"
              value={action}
              onChange={(e) => {
                setAction(e.target.value as GovernanceProposalAction);
                setTarget("");
                setAmount("");
              }}
              disabled={isCreating}
              className="w-full bg-gray-900 border border-stellar-border rounded px-3 py-2 text-sm text-white outline-none focus:border-primary-500 disabled:opacity-50"
            >
              {ACTIONS.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">{ACTION_DESCRIPTIONS[action]}</p>
          </div>

          {(action === "Funding" || action === "AddMember" || action === "RemoveMember") && (
            <div>
              <label htmlFor="target" className="block text-xs font-medium text-gray-300 mb-1">
                {action === "Funding" ? "Destination Address" : "Target Address"}
              </label>
              <input
                id="target"
                type="text"
                placeholder="G... or C..."
                value={target}
                onChange={(e) => {
                  setTarget(e.target.value);
                  handleFieldChange("target", e.target.value, (v) => validateTarget(v, action));
                }}
                onBlur={() => handleFieldBlur("target")}
                disabled={isCreating}
                aria-describedby={touched.target && fieldErrors.target ? "target-error" : undefined}
                aria-invalid={touched.target && !!fieldErrors.target}
                className={`w-full bg-gray-900 border rounded px-3 py-2 text-sm text-white outline-none focus:border-primary-500 disabled:opacity-50 transition-colors ${
                  touched.target && fieldErrors.target ? "border-red-500" : "border-stellar-border"
                }`}
              />
              {touched.target && fieldErrors.target && (
                <p id="target-error" className="text-xs text-red-400 mt-1">{fieldErrors.target}</p>
              )}
            </div>
          )}

          {action === "Funding" && (
            <div>
              <label htmlFor="amount" className="block text-xs font-medium text-gray-300 mb-1">
                Amount (XLM)
              </label>
              <input
                id="amount"
                type="number"
                placeholder="0.00"
                step="0.0000001"
                min="0"
                value={amount}
                onChange={(e) => {
                  const sanitized = sanitizeXlmInput(e.target.value);
                  setAmount(sanitized);
                  handleFieldChange("amount", sanitized, (v) => validateAmount(v, action));
                }}
                onBlur={() => handleFieldBlur("amount")}
                disabled={isCreating}
                aria-describedby={touched.amount && fieldErrors.amount ? "amount-error" : undefined}
                aria-invalid={touched.amount && !!fieldErrors.amount}
                className={`w-full bg-gray-900 border rounded px-3 py-2 text-sm text-white outline-none focus:border-primary-500 disabled:opacity-50 transition-colors ${
                  touched.amount && fieldErrors.amount ? "border-red-500" : "border-stellar-border"
                }`}
              />
              {touched.amount && fieldErrors.amount && (
                <p id="amount-error" className="text-xs text-red-400 mt-1">{fieldErrors.amount}</p>
              )}
            </div>
          )}

          {submitError && <p className="text-sm text-red-400">{submitError}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="btn-secondary text-sm disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !title.trim() || !description.trim()}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {isCreating ? "Creating..." : "Create Proposal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
