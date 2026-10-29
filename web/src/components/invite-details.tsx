"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import type { InviteDetails } from "@/lib/echo";
import { cleanDetails, DETAIL_LIMITS, mergedDetails } from "@/lib/invitations";

type Field = "dates" | "format" | "length" | "fee";

const FIELDS: Field[] = ["dates", "format", "length", "fee"];
const OWN_FIELDS: Field[] = ["dates", "fee"];

const NAMES: Record<Field, string> = {
  dates: "Recording dates",
  format: "In person or remote",
  length: "Length",
  fee: "Fee",
};

const PAID = "Paid";

const SAY: Record<Field, (details: InviteDetails) => string> = {
  dates: (details) => details.dates?.trim() ?? "",
  format: (details) =>
    details.format === "remote"
      ? "Remote"
      : details.format === "in_person"
        ? details.place?.trim()
          ? `In person, ${details.place.trim()}`
          : "In person"
        : "",
  length: (details) => details.length?.trim() ?? "",
  fee: (details) => {
    const fee = details.fee?.trim();
    if (details.unpaid) return "Unpaid";
    if (!fee) return "";
    return fee === PAID ? PAID : `Paid, ${fee}`;
  },
};

const CLEARED: Record<Field, Partial<InviteDetails>> = {
  dates: { dates: "" },
  format: { format: undefined, place: "" },
  length: { length: "" },
  fee: { fee: "", unpaid: false },
};

const ICONS: Record<Field, ReactNode> = {
  dates: (
    <>
      <rect x="1.5" y="2.5" width="9" height="8" rx="1.5" />
      <path d="M1.5 5.25h9M4 1.25v2.25M8 1.25v2.25" />
    </>
  ),
  format: (
    <>
      <rect x="4.25" y="1.25" width="3.5" height="6" rx="1.75" />
      <path d="M2.5 5.75a3.5 3.5 0 007 0M6 9.25v1.5" />
    </>
  ),
  length: (
    <>
      <circle cx="6" cy="6" r="4.75" />
      <path d="M6 3.25V6l1.9 1.25" />
    </>
  ),
  fee: (
    <>
      <circle cx="6" cy="6" r="4.75" />
      <path d="M7.6 4.6c-.3-.6-.9-.9-1.6-.9-.9 0-1.5.5-1.5 1.15 0 1.5 3.1.8 3.1 2.35 0 .7-.7 1.15-1.6 1.15-.75 0-1.35-.3-1.7-.9M6 2.6v1.1M6 8.3v1.1" />
    </>
  ),
};

function Icon({ field }: { field: Field }) {
  return (
    <svg aria-hidden viewBox="0 0 12 12" className="size-3.5 shrink-0">
      <g fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        {ICONS[field]}
      </g>
    </svg>
  );
}

export function DetailsPicker({
  details,
  onChange,
  fields = FIELDS,
  inherited,
  label,
}: {
  details: InviteDetails;
  onChange: (change: Partial<InviteDetails>) => void;
  fields?: Field[];
  inherited?: InviteDetails;
  label: string;
}) {
  const id = useId();
  const [open, setOpen] = useState<Field | null>(null);
  const chips = useRef<Partial<Record<Field, HTMLButtonElement | null>>>({});

  function close() {
    if (open) chips.current[open]?.focus();
    setOpen(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label={label} className="flex flex-wrap gap-2">
        {fields.map((field) => {
          const own = SAY[field](details);
          const theirs = inherited ? SAY[field](inherited) : "";
          const on = open === field;
          return (
            <button
              key={field}
              ref={(button) => {
                chips.current[field] = button;
              }}
              type="button"
              aria-expanded={on}
              aria-controls={on ? `${id}-${field}` : undefined}
              aria-label={`${NAMES[field]}: ${own || (theirs ? `same as everyone, ${theirs}` : "not given")}`}
              title={NAMES[field]}
              onClick={() => setOpen(on ? null : field)}
              className={`inline-flex min-h-10 max-w-full items-center gap-2 rounded-full border px-3.5 text-sm transition-colors ${
                own
                  ? `bg-deck-hi text-ink ${inherited ? "border-brand/70" : "border-transparent"}`
                  : theirs
                    ? "border-steel-hi text-ink-soft"
                    : "border-dashed border-steel-hi text-ink-dim hover:text-ink-soft"
              } ${on ? "ring-2 ring-accent/40" : "hover:border-ink-dim"}`}
            >
              <Icon field={field} />
              <span className="truncate">{own || theirs || NAMES[field]}</span>
            </button>
          );
        })}
      </div>
      {open && (
        <Choices
          key={open}
          id={`${id}-${open}`}
          field={open}
          details={details}
          inherited={inherited ? SAY[open](inherited) : undefined}
          onChange={onChange}
          onClose={close}
        />
      )}
    </div>
  );
}

const QUICK: Partial<Record<Field, string[]>> = {
  dates: ["This month", "Next month", "Flexible"],
  length: ["30 min", "45 min", "60 min", "90 min"],
};

const TYPED: Partial<Record<Field, { key: "dates" | "length"; placeholder: string }>> = {
  dates: { key: "dates", placeholder: "Or in your words: weekdays in March" },
  length: { key: "length", placeholder: "Or in your words: about an hour" },
};

const pill = (on: boolean) =>
  `min-h-9 rounded-full px-3.5 text-sm transition-colors ${
    on ? "bg-ink text-void" : "text-ink-soft ring-1 ring-steel-hi hover:bg-deck-hi hover:text-ink"
  }`;

function Choices({
  id,
  field,
  details,
  inherited,
  onChange,
  onClose,
}: {
  id: string;
  field: Field;
  details: InviteDetails;
  inherited?: string;
  onChange: (change: Partial<InviteDetails>) => void;
  onClose: () => void;
}) {
  const given = SAY[field](details) !== "";
  const typed = TYPED[field];
  const paid = !details.unpaid && Boolean(details.fee?.trim());

  function choose(change: Partial<InviteDetails>, done = true) {
    onChange(change);
    if (done) onClose();
  }

  function keys(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" || (event.key === "Enter" && event.target instanceof HTMLInputElement)) {
      event.preventDefault();
      onClose();
    }
  }

  return (
    <div
      id={id}
      role="group"
      aria-label={NAMES[field]}
      onKeyDown={keys}
      className="rise flex max-w-xl flex-col gap-3 rounded-2xl bg-well p-4 shadow-[inset_0_0_0_1px_var(--steel)]"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="tag text-ink-dim">{NAMES[field]}</span>
        <span className="flex items-baseline gap-3">
          {given && (
            <button
              type="button"
              onClick={() => choose(CLEARED[field])}
              className="text-xs text-ink-soft underline underline-offset-4 hover:text-ink"
            >
              {inherited ? "Same as everyone" : "Clear"}
            </button>
          )}
          <button type="button" onClick={onClose} className="btn btn-sm">
            Done
          </button>
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {field === "dates" || field === "length"
          ? QUICK[field]?.map((choice) => {
              const on = (details[field] ?? "").trim() === choice;
              return (
                <button
                  key={choice}
                  type="button"
                  aria-pressed={on}
                  onClick={() => choose({ [field]: on ? "" : choice }, !on)}
                  className={pill(on)}
                >
                  {choice}
                </button>
              );
            })
          : field === "format"
            ? (
                [
                  { value: "in_person", name: "In person" },
                  { value: "remote", name: "Remote" },
                ] as const
              ).map(({ value, name }) => {
                const on = details.format === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => choose({ format: on ? undefined : value }, !on && value === "remote")}
                    className={pill(on)}
                  >
                    {name}
                  </button>
                );
              })
            : [
                <button
                  key="unpaid"
                  type="button"
                  aria-pressed={Boolean(details.unpaid)}
                  onClick={() => choose({ unpaid: !details.unpaid }, !details.unpaid)}
                  className={pill(Boolean(details.unpaid))}
                >
                  Unpaid
                </button>,
                <button
                  key="paid"
                  type="button"
                  aria-pressed={paid}
                  onClick={() =>
                    choose(paid ? { fee: "" } : { unpaid: false, fee: details.fee?.trim() || PAID }, false)
                  }
                  className={pill(paid)}
                >
                  Paid
                </button>,
              ]}
      </div>
      {typed && (
        <input
          aria-label={`${NAMES[field]} in your words`}
          value={details[typed.key] ?? ""}
          onChange={(event) => onChange({ [typed.key]: event.target.value })}
          maxLength={DETAIL_LIMITS[typed.key]}
          placeholder={inherited ? `Same as everyone: ${inherited}` : typed.placeholder}
          className="field h-10 w-full min-w-0 px-3 text-sm"
        />
      )}
      {field === "format" && details.format === "in_person" && (
        <input
          aria-label="Where"
          autoFocus
          value={details.place ?? ""}
          onChange={(event) => onChange({ place: event.target.value })}
          maxLength={DETAIL_LIMITS.place}
          placeholder="Where, if you like: our studio in Brooklyn"
          className="field h-10 w-full min-w-0 px-3 text-sm"
        />
      )}
      {field === "fee" && paid && (
        <input
          aria-label="How much"
          autoFocus
          value={details.fee?.trim() === PAID ? "" : (details.fee ?? "")}
          onChange={(event) => onChange({ fee: event.target.value.trim() ? event.target.value : PAID, unpaid: false })}
          maxLength={DETAIL_LIMITS.fee}
          placeholder="How much, if you like: $300"
          className="field h-10 w-full min-w-0 px-3 text-sm"
        />
      )}
      {inherited && !given && field === "fee" && <p className="text-xs text-ink-dim">Everyone: {inherited}</p>}
    </div>
  );
}

export function GuestDetailsLine({
  name,
  shared,
  own,
  onOwn,
}: {
  name: string;
  shared: InviteDetails;
  own: InviteDetails;
  onOwn: (own: InviteDetails) => void;
}) {
  const [opened, setOpened] = useState(false);
  const forAll = cleanDetails(shared);
  const theirs = cleanDetails(own);
  const open = opened || theirs !== undefined;
  const merged = mergedDetails(forAll, theirs);
  const words = FIELDS.flatMap((field) => {
    const text = SAY[field](merged);
    const mine = OWN_FIELDS.includes(field) && Boolean(theirs && SAY[field](theirs));
    return text ? [{ field, text, mine }] : [];
  });
  const change = "text-xs text-ink-soft underline underline-offset-4 hover:text-ink";

  if (open) {
    const rest = words.filter(({ field }) => !OWN_FIELDS.includes(field));
    return (
      <div className="flex flex-col gap-2">
        <DetailsPicker
          details={own}
          inherited={forAll ?? {}}
          fields={OWN_FIELDS}
          label={`Dates and fee for ${name}`}
          onChange={(next) => {
            setOpened(true);
            onOwn({ ...own, ...next });
          }}
        />
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-ink-soft">
          {rest.length > 0 && <span>{rest.map(({ text }) => text).join(" · ")}</span>}
          <button
            type="button"
            onClick={() => {
              onOwn({});
              setOpened(false);
            }}
            className={change}
          >
            Same as everyone
          </button>
        </p>
      </div>
    );
  }

  return (
    <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
      {words.length > 0 && (
        <span aria-label={`Details for ${name}`} className="text-ink-soft">
          {words.map(({ field, text }, index) => (
            <span key={field}>
              {index > 0 && <span className="text-ink-dim"> · </span>}
              {text}
            </span>
          ))}
        </span>
      )}
      <button type="button" onClick={() => setOpened(true)} className={change}>
        {forAll?.dates || forAll?.fee || forAll?.unpaid ? "Change for them" : "Dates or fee for them"}
      </button>
    </p>
  );
}

const MORE: Partial<Record<Field, string[]>> = {
  dates: QUICK.dates,
  length: QUICK.length,
};

// Everyone's details on the invite page, each with its choices in sight: one click sets or clears one, with a field
// beside the choices for anything in the host's own words. The guests' cards keep the smaller DetailsPicker.
export function DetailsRows({
  details,
  onChange,
}: {
  details: InviteDetails;
  onChange: (change: Partial<InviteDetails>) => void;
}) {
  return (
    // Two columns only once each row's choices fit on one line.
    <div className="@container">
      <div className="grid gap-x-8 gap-y-4 @[44rem]:grid-cols-2">
        {FIELDS.map((field) => (
          <Row key={field} field={field} details={details} onChange={onChange} />
        ))}
      </div>
    </div>
  );
}

function Row({
  field,
  details,
  onChange,
}: {
  field: Field;
  details: InviteDetails;
  onChange: (change: Partial<InviteDetails>) => void;
}) {
  const quick = MORE[field];
  const typedKey = field === "dates" || field === "length" ? field : undefined;
  const value = typedKey ? (details[typedKey] ?? "") : "";
  const custom = Boolean(quick && value.trim() && !quick.includes(value.trim()));
  const [other, setOther] = useState(custom);
  const showOther = other || custom;
  const paid = !details.unpaid && Boolean(details.fee?.trim());
  const small = "field h-9 min-w-36 flex-1 px-3 text-sm";

  const choices: { name: string; on: boolean; pick: () => void }[] =
    quick && typedKey
      ? [
          ...quick.map((choice) => ({
            name: choice,
            on: value.trim() === choice,
            pick: () => {
              setOther(false);
              onChange({ [typedKey]: value.trim() === choice ? "" : choice });
            },
          })),
          {
            name: "Other",
            on: showOther,
            pick: () => {
              setOther(!showOther);
              if (custom || !showOther) onChange({ [typedKey]: "" });
            },
          },
        ]
      : field === "format"
        ? [
            { name: "Remote", on: details.format === "remote", value: "remote" as const },
            { name: "In person", on: details.format === "in_person", value: "in_person" as const },
          ].map(({ name, on, value: format }) => ({ name, on, pick: () => onChange({ format: on ? undefined : format }) }))
        : [
            {
              name: "Unpaid",
              on: Boolean(details.unpaid),
              pick: () => onChange({ unpaid: !details.unpaid, fee: "" }),
            },
            {
              name: "Paid",
              on: paid,
              pick: () => onChange(paid ? { fee: "" } : { unpaid: false, fee: PAID }),
            },
          ];

  return (
    <div role="group" aria-label={NAMES[field]} className="flex min-w-0 flex-col gap-2">
      <span className="tag flex items-center gap-1.5 text-ink-dim">
        <Icon field={field} />
        {NAMES[field]}
      </span>
      <div className="flex flex-wrap items-center gap-1">
        {choices.map(({ name, on, pick }) => (
          <button key={name} type="button" aria-pressed={on} onClick={pick} className={`${pill(on)} px-3!`}>
            {name}
          </button>
        ))}
        {typedKey && showOther && (
          <input
            aria-label={`${NAMES[field]} in your words`}
            autoFocus={!custom}
            value={value}
            onChange={(event) => onChange({ [typedKey]: event.target.value })}
            maxLength={DETAIL_LIMITS[typedKey]}
            placeholder={TYPED[field]?.placeholder.replace("Or in your words: ", "e.g. ")}
            className={small}
          />
        )}
        {field === "format" && details.format === "in_person" && (
          <input
            aria-label="Where"
            value={details.place ?? ""}
            onChange={(event) => onChange({ place: event.target.value })}
            maxLength={DETAIL_LIMITS.place}
            placeholder="Where, e.g. our studio"
            className={small}
          />
        )}
        {field === "fee" && paid && (
          <input
            aria-label="How much"
            value={details.fee?.trim() === PAID ? "" : (details.fee ?? "")}
            onChange={(event) =>
              onChange({ fee: event.target.value.trim() ? event.target.value : PAID, unpaid: false })
            }
            maxLength={DETAIL_LIMITS.fee}
            placeholder="How much, e.g. $300"
            className={small}
          />
        )}
      </div>
    </div>
  );
}
