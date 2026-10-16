import { altSpellings, displayOrigin, popularityLabel } from "@/lib/domain";
import { GENDER_LABEL, type Cluster, type Gender } from "@/lib/types";

export function GenderDot({ gender, size = 10 }: { gender: Gender; size?: number }) {
  return <span className={`gender-dot gender-${gender}`} style={{ width: size, height: size }} aria-hidden="true" />;
}

/** One body for the swipe card and the detail overlay, so they can't drift apart. */
export function NameCardContent({ cluster }: { cluster: Cluster }) {
  const alts = altSpellings(cluster).slice(0, 8);
  const pop = popularityLabel(cluster);
  const origin = displayOrigin(cluster);
  return (
    <>
      <div className="card-name">{cluster.name}</div>
      {alts.length > 0 && (
        <div className="row" aria-label="Alternate spellings">
          {alts.map((alt) => (
            <span key={alt} className="chip small">
              {alt}
            </span>
          ))}
        </div>
      )}
      <div className="row">
        <GenderDot gender={cluster.gender} />
        <span className="label">{GENDER_LABEL[cluster.gender]}</span>
        {origin && (
          <>
            <span className="label" aria-hidden="true">·</span>
            <span className="label">{origin.toUpperCase()}</span>
          </>
        )}
      </div>
      {cluster.meaning && <p className="meaning" style={{ margin: 0 }}>{cluster.meaning}</p>}
      {cluster.etymology && <p className="etymology" style={{ margin: 0 }}>{cluster.etymology}</p>}
      {pop && <span className="pop">✦ {pop}</span>}
      {cluster.addedBy && (
        <span className="added-by">{cluster.addedBy === "me" ? "Added by you" : "Added by your partner"}</span>
      )}
    </>
  );
}
