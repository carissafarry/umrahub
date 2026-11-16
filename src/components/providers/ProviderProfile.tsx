import Link from "next/link";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import {
  ArrowRightIcon,
  ChevronRightIcon,
  FlagIcon,
} from "@/components/ui/icons";
import type { ProviderProfileData } from "@/lib/providers/queries";
import { VerifiedCheck } from "./VerifiedCheck";

const focusRing =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => [...word][0])
    .join("")
    .toUpperCase();
}

const toUtc = (isoDate: string) => new Date(`${isoDate}T00:00:00Z`);

// The /penyedia/[id] page body: header (with the unverified warning), then
// the Afiliasi card, bio, catalogue, reviews, schedules and contact. From
// `lg` the Afiliasi card and the contact area sit in a side column.
export function ProviderProfile({ profile }: { profile: ProviderProfileData }) {
  const t = useTranslations("ProviderProfile");
  const format = useFormatter();
  const en = useLocale() === "en";
  const bio = en ? (profile.bioEn ?? profile.bioId) : profile.bioId;
  const verified = profile.verifiedOn !== null;
  const rating = profile.rating
    ? t("rating", {
        rating: format.number(profile.rating.average, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        }),
        count: profile.rating.count,
      })
    : null;
  const sectionHeading = "text-lg font-bold tracking-tight";

  return (
    <div className="mx-auto w-full max-w-md flex-1 px-5 md:max-w-3xl md:px-8 lg:max-w-[75rem] lg:px-10">
      <main className="flex flex-col gap-6 pt-2 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-x-10 lg:gap-y-8 lg:pt-8 lg:pb-16">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Link
            href="/dashboard"
            className={`tap-target inline-flex items-center gap-2 self-start rounded-full border border-border bg-surface-raised px-4 text-sm font-semibold text-foreground ${focusRing}`}
          >
            <ArrowRightIcon className="size-4 rotate-180" />
            {t("backToHome")}
          </Link>

          <header className="flex flex-col items-center gap-2 text-center lg:items-start lg:text-start">
            <span
              role="img"
              aria-label={t("initialsLabel", { name: profile.name })}
              className="flex size-24 items-center justify-center rounded-full bg-accent-soft text-3xl font-bold text-accent"
            >
              {initials(profile.name)}
            </span>
            <h1 className="flex items-center gap-2 text-3xl leading-tight font-bold lg:text-4xl">
              {profile.name}
              {verified && <VerifiedCheck className="size-6" />}
            </h1>
            <p className="text-muted">
              {t(`type.${profile.providerType}`)}
              {profile.verifiedOn &&
                ` · ${t("verifiedOn", {
                  date: format.dateTime(toUtc(profile.verifiedOn), {
                    month: "short",
                    year: "numeric",
                    timeZone: "UTC",
                  }),
                })}`}
            </p>
            {rating && <p className="text-sm font-semibold">{rating}</p>}
          </header>

          {!verified && (
            <p className="flex items-start gap-3 rounded-2xl bg-warning-soft p-4 text-sm font-semibold text-warning">
              <FlagIcon className="mt-0.5 size-5 shrink-0" />
              <span>{t("unverified")}</span>
            </p>
          )}
        </div>

        {profile.affiliations.length > 0 && (
          <Card
            as="section"
            className="flex flex-col gap-3 border-accent lg:col-start-2 lg:row-start-2 lg:self-start lg:p-7"
          >
            <h2 className={sectionHeading}>{t("affiliationTitle")}</h2>
            <ul className="flex flex-col divide-y divide-surface-line">
              {profile.affiliations.map((affiliation) => (
                <li key={affiliation.providerId}>
                  <Link
                    href={`/penyedia/${affiliation.providerId}`}
                    className={`tap-target flex items-center gap-3 rounded-xl py-3 ${focusRing}`}
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="flex items-center gap-2 font-bold">
                        <span className="break-words">{affiliation.name}</span>
                        {affiliation.verified && <VerifiedCheck />}
                      </span>
                      <span className="text-sm text-muted">
                        {profile.providerType === "muthawif"
                          ? `${t(`relationship.${affiliation.relationship}`)} · ${t("since", { year: affiliation.startedYear })}`
                          : affiliation.rating
                            ? t("rating", {
                                rating: format.number(
                                  affiliation.rating.average,
                                  {
                                    minimumFractionDigits: 1,
                                    maximumFractionDigits: 1,
                                  },
                                ),
                                count: affiliation.rating.count,
                              })
                            : t("since", { year: affiliation.startedYear })}
                      </span>
                    </span>
                    <ChevronRightIcon className="size-5 shrink-0 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <div className="flex min-w-0 flex-col gap-8 lg:col-start-1 lg:row-span-2 lg:row-start-2">
          {bio && (
            <section className="flex flex-col gap-2">
              <h2 className={sectionHeading}>{t("bioTitle")}</h2>
              <p className="whitespace-pre-line">{bio}</p>
            </section>
          )}

          {profile.catalog.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className={sectionHeading}>{t("catalogTitle")}</h2>
              <ul className="grid gap-4 md:grid-cols-2">
                {profile.catalog.map((item) => (
                  <li key={item.id} className="flex">
                    <Link
                      href={`/penyedia/${profile.id}/katalog/${item.id}`}
                      className={`flex w-full flex-col gap-2 rounded-[1.75rem] border border-surface-line bg-surface p-4 ${focusRing}`}
                    >
                      {item.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element -- remote catalogue photo; no next/image host config
                        <img
                          src={item.image_url}
                          alt={en ? (item.title_en ?? item.title_id) : item.title_id}
                          width={640}
                          height={360}
                          loading="lazy"
                          className="aspect-video w-full rounded-2xl bg-surface-raised object-cover"
                        />
                      )}
                      <span className="font-bold break-words">
                        {en ? (item.title_en ?? item.title_id) : item.title_id}
                      </span>
                      <span className="line-clamp-3 text-sm text-muted">
                        {en
                          ? (item.description_en ?? item.description_id)
                          : item.description_id}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="flex flex-col gap-3">
            <h2 className={sectionHeading}>{t("reviewsTitle")}</h2>
            {profile.reviews.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {profile.reviews.map((review, index) => (
                  <li key={index}>
                    <Card className="flex flex-col gap-1">
                      <p className="flex flex-wrap items-center gap-x-3 text-sm">
                        <span className="font-bold">{review.display_name}</span>
                        <span
                          role="img"
                          aria-label={t("reviewStars", { rating: review.rating })}
                          className="text-warning"
                        >
                          {"★".repeat(review.rating)}
                          <span className="text-muted">
                            {"☆".repeat(5 - review.rating)}
                          </span>
                        </span>
                        <span className="text-muted">
                          {format.dateTime(new Date(review.created_at), {
                            month: "short",
                            year: "numeric",
                            timeZone: "UTC",
                          })}
                        </span>
                      </p>
                      <p className="break-words whitespace-pre-line">
                        {review.content}
                      </p>
                    </Card>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">{t("reviewsEmpty")}</p>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className={sectionHeading}>{t("schedulesTitle")}</h2>
            {profile.schedules.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {profile.schedules.map((schedule) => (
                  <li key={schedule.id}>
                    <Card className="flex flex-col gap-1">
                      <p className="font-bold">
                        {en ? schedule.serviceNameEn : schedule.serviceNameId}
                        {" · "}
                        {schedule.city}
                      </p>
                      <p className="text-sm text-muted">
                        {format.dateTime(toUtc(schedule.scheduleDate), {
                          dateStyle: "medium",
                          timeZone: "UTC",
                        })}
                      </p>
                      {schedule.fromPriceSar !== null && (
                        <p className="text-sm">
                          {t("scheduleFrom", {
                            price: format.number(schedule.fromPriceSar),
                          })}
                        </p>
                      )}
                    </Card>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">{t("schedulesEmpty")}</p>
            )}
          </section>
        </div>

        <section
          className={`flex flex-col gap-3 lg:col-start-2 lg:self-start ${
            profile.affiliations.length > 0 ? "lg:row-start-3" : "lg:row-start-2"
          }`}
        >
          <h2 className={sectionHeading}>{t("contactTitle")}</h2>
          {profile.whatsappUrl ? (
            <ButtonLink
              href={profile.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("whatsapp")}
              <span className="sr-only"> {t("opensInNewTab")}</span>
            </ButtonLink>
          ) : (
            <p className="text-muted">{t("contactUnavailable")}</p>
          )}
        </section>
      </main>
    </div>
  );
}
