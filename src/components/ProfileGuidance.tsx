import type { Profile } from "../types";
import { profileGuidance, youthSource } from "../lib/profile-guidance";
export default function ProfileGuidance({ profile }: { profile: Profile }) {
  const advice = profileGuidance(profile);
  if (!advice.length) return null;
  return (
    <div className="notice">
      <strong>
        {profile.age !== undefined && profile.age < 19
          ? "Výživa při růstu a sportu"
          : "Tvůj sportovní profil"}
      </strong>
      {advice.map((text) => (
        <p className="fine" key={text}>
          {text}
        </p>
      ))}
      {profile.age !== undefined && profile.age < 19 && (
        <a className="fine" href={youthSource} target="_blank" rel="noreferrer">
          Obecné informace pro dospívající · British Nutrition Foundation
        </a>
      )}
    </div>
  );
}
