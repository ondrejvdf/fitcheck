import { useEffect, useState, useMemo, useRef, lazy, Suspense } from "react";
import type {
  Food,
  Profile as ProfileType,
  DiaryEntry,
  DiaryDay,
  Meal,
} from "./types";
import { goals } from "./types";
import Icon, { type IconName } from "./components/Icon";
import Home from "./pages/Home";
import Diary from "./pages/Diary";
import TargetSettings from "./pages/TargetSettings";
import AddToDay from "./components/AddToDay";
import RepeatMeal from "./components/RepeatMeal";
import { libraryFoods } from "./lib/catalog";
import { upgradeBlocked } from "./lib/database";
import { dailyPlan } from "./lib/targets";
import { dayKey, validDay } from "./lib/diary";
import Manual from "./pages/Manual";
import Profile from "./pages/Profile";
import Result from "./pages/Result";
import { evaluatePersonal } from "./lib/personalization";
import Compare from "./pages/Compare";
import { verdict } from "./lib/scoring";
import {
  loadProfile,
  saveProfile,
  listFoods,
  putFood,
  deleteFood,
  clearFoods,
  clearAll,
  searchLocal,
  getSaved,
  listEntries,
  listDays,
  saveEntry,
  saveEntries,
  removeEntry,
  saveDay,
  importRecords,
  exportRecords,
  ensureRecovery,
  readRecovery,
  importConflicts,
} from "./lib/storage";
import { mergeLocalEdits, applyCorrections } from "./lib/corrections";
import { lookup, searchFoods } from "./lib/off";
import { parseBackup } from "./lib/backup";
const Scanner = lazy(() => import("./components/Scanner"));
type Page =
  | "home"
  | "diary"
  | "search"
  | "manual"
  | "edit"
  | "history"
  | "favorites"
  | "compare"
  | "settings"
  | "install"
  | "result";
const nav: { id: Page; label: string; icon: IconName }[] = [
  { id: "home", label: "Přehled", icon: "House" },
  { id: "search", label: "Najít potravinu", icon: "ScanLine" },
  { id: "diary", label: "Můj jídelníček", icon: "ClipboardPen" },
  { id: "history", label: "Historie", icon: "History" },
  { id: "favorites", label: "Oblíbené", icon: "Heart" },
  { id: "compare", label: "Porovnání", icon: "ChartNoAxesCombined" },
];
export default function App() {
  const [page, setPage] = useState<Page>("home"),
    [profile, setProfile] = useState(loadProfile),
    [foods, setFoods] = useState<Food[]>([]),
    [active, setActive] = useState<Food | null>(null),
    [scan, setScan] = useState(false),
    [query, setQuery] = useState(""),
    [mode, setMode] = useState("name"),
    [results, setResults] = useState<Food[]>([]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [online, setOnline] = useState(navigator.onLine),
    [selected, setSelected] = useState<string[]>([]),
    [install, setInstall] = useState<any>(null);
  const [entries, setEntries] = useState<DiaryEntry[]>([]),
    [days, setDays] = useState<DiaryDay[]>([]),
    [today, setToday] = useState(dayKey()),
    [date, setDate] = useState(dayKey()),
    [more, setMore] = useState(false);
  const [add, setAdd] = useState<{
      food: Food;
      meal: Meal;
      entry?: DiaryEntry;
    } | null>(null),
    [pendingMeal, setPendingMeal] = useState<Meal>("snack"),
    [correctionEntry, setCorrectionEntry] = useState<DiaryEntry | null>(null);
  const previousDay = useRef(today);
  const [repeat, setRepeat] = useState<DiaryEntry[] | null>(null);
  const plan = useMemo(() => dailyPlan(profile), [profile]);
  const selectedTargets =
    date === today
      ? plan.targets
      : (days.find((d) => d.day === date)?.targets ?? null);
  const refreshDiary = async () => {
    const [e, d] = await Promise.all([listEntries(), listDays()]);
    setEntries(e);
    setDays(d);
  };
  useEffect(() => {
    refreshDiary().catch(() =>
      setMessage("Deník nelze načíst. Zkontroluj úložiště prohlížeče."),
    );
    const update = () => setToday(dayKey());
    const timer = window.setInterval(update, 30000);
    window.addEventListener("focus", update);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", update);
    };
  }, []);
  useEffect(() => {
    const oldDay = previousDay.current;
    previousDay.current = today;
    setDate((d) => (d === oldDay ? today : d));
  }, [today]);
  useEffect(() => {
    if (!entries.some((e) => e.day === today)) return;
    const snap: DiaryDay = {
      day: today,
      targets: plan.targets,
      model: plan.model,
      goal: profile.goal,
      mode: profile.targetMode ?? "auto",
      capturedAt: new Date().toISOString(),
    };
    ensureRecovery()
      .then(() => saveDay(snap))
      .then(() =>
        setDays((old) => [...old.filter((d) => d.day !== today), snap]),
      )
      .catch(() => setMessage("Denní cíle se nepodařilo uložit."));
  }, [profile, today, entries, plan]);
  const persistGroup = async (group: DiaryEntry[]) => {
    const e = group[0];
    if (
      !e ||
      group.some(
        (row) => !validDay(row.day) || row.day !== e.day || row.day > dayKey(),
      )
    )
      throw Error("Jídlo zapisuj nejpozději do dneška.");
    const snap: DiaryDay = {
      day: e.day,
      targets: plan.targets,
      model: plan.model,
      goal: profile.goal,
      mode: profile.targetMode ?? "auto",
      capturedAt: new Date().toISOString(),
    };
    await saveEntries(group, snap);
    await refreshDiary();
    setDate(e.day);
    setPage("diary");
    setMessage("Jídlo je uložené. Denní součty byly aktualizovány.");
  };
  const persistEntry = async (e: DiaryEntry) => persistGroup([e]);
  const deleteMeal = async (id: string) => {
    try {
      await removeEntry(id);
      await refreshDiary();
    } catch {
      setMessage("Jídlo se nepodařilo odstranit.");
    }
  };
  useEffect(() => {
    const blocked = () =>
      setMessage(
        "Aktualizaci úložiště blokuje jiná otevřená karta FitChecku. Zavři ostatní karty aplikace a tuto obnov. Dosavadní data zůstávají zachovaná.",
      );
    if (upgradeBlocked) blocked();
    window.addEventListener("fitcheck-db-blocked", blocked);
    return () => window.removeEventListener("fitcheck-db-blocked", blocked);
  }, []);
  const refresh = () =>
    listFoods()
      .then(setFoods)
      .catch(() =>
        setMessage("Úložiště není dostupné. Zkontroluj oprávnění prohlížeče."),
      );
  useEffect(() => {
    refresh();
    const status = () => setOnline(navigator.onLine),
      prompt = (e: Event) => {
        e.preventDefault();
        setInstall(e);
      };
    window.addEventListener("online", status);
    window.addEventListener("offline", status);
    window.addEventListener("beforeinstallprompt", prompt);
    return () => {
      window.removeEventListener("online", status);
      window.removeEventListener("offline", status);
      window.removeEventListener("beforeinstallprompt", prompt);
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = profile.theme;
    let current = true;
    ensureRecovery()
      .then(() => {
        if (current) saveProfile(profile);
      })
      .catch(() => {
        setMessage(
          "Nastavení nelze uložit. Zkontroluj volné místo a oprávnění.",
        );
      });
    return () => {
      current = false;
    };
  }, [profile]);
  const go = (p: Page) => {
    setPage(p);
    setMore(false);
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const openFood = async (f: Food) => {
    try {
      const preserved = mergeLocalEdits(f, await getSaved(f.id));
      const item = {
        ...preserved,
        date: new Date().toISOString(),
        favorite: foods.find((x) => x.id === f.id)?.favorite ?? f.favorite,
      };
      await putFood(item);
      await refresh();
      setActive(item);
      go("result");
    } catch {
      setMessage(
        "Potravinu se nepodařilo uložit. Zkus exportovat data a uvolnit místo.",
      );
    }
  };
  const find = async (q = query, kind = mode) => {
    setBusy(true);
    setMessage("");
    try {
      if (kind === "barcode") {
        await openFood(await lookup(q));
      } else {
        const items = await searchFoods(q);
        setResults(items);
        if (!items.length)
          setMessage("Nic jsme nenašli. Přidej potravinu ručně.");
      }
    } catch (e) {
      if (kind === "name") {
        const local = await searchLocal(q);
        setResults(local);
        setMessage(
          (e as Error).message +
            (local.length
              ? " Zobrazeny shody z tvého zařízení."
              : " V uložených potravinách také není shoda."),
        );
      } else setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const favorite = async (f: Food) => {
    const saved = foods.find((x) => x.id === f.id);
    const item = { ...f, ...saved, favorite: !(saved?.favorite ?? f.favorite) };
    await putFood(item);
    if (active?.id === f.id) setActive(item);
    await refresh();
  };
  const cards = (items: Food[]) =>
    items.length ? (
      <div className="food-grid">
        {items.map((f) => {
          const s = evaluatePersonal(f, profile);
          return (
            <article className="food-card" key={f.id}>
              <button className="food-open" onClick={() => openFood(f)}>
                <div className={"food-image " + f.category}>
                  {f.image ? (
                    <img loading="lazy" src={f.image} alt="" />
                  ) : (
                    <Icon name="Leaf" size={36} />
                  )}
                  <span className="food-score">
                    {s.total ?? "—"}
                    {s.total !== null ? " %" : ""}
                  </span>
                </div>
                <div className="food-copy">
                  <span className="fine">
                    {f.source === "demo"
                      ? "DEMONSTRAČNÍ PŘÍKLAD"
                      : f.brand || "Vlastní potravina"}
                  </span>
                  <h3>{f.name}</h3>
                  <span className="fine">
                    {verdict(s.total)} ·{" "}
                    {new Date(f.date).toLocaleDateString("cs-CZ")}
                  </span>
                </div>
              </button>
              <div className="food-actions">
                <button className="text-button" onClick={() => favorite(f)}>
                  <Icon name="Heart" size={17} />
                  {f.favorite ? "Uloženo" : "Uložit"}
                </button>
                <button
                  className="icon-button"
                  aria-label={"Smazat " + f.name}
                  onClick={async () => {
                    await deleteFood(f.id);
                    refresh();
                  }}
                >
                  <Icon name="Trash2" size={17} />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    ) : (
      <div className="empty">
        <Icon name="Leaf" size={32} />
        <h3>Tvoje první lepší volba je před tebou.</h3>
        <p>
          Naskenuj obal nebo přidej údaje ručně. Uložené potraviny najdeš právě
          tady.
        </p>
        <button className="button secondary" onClick={() => go("manual")}>
          Přidat první potravinu <Icon name="Plus" size={17} />
        </button>
      </div>
    );
  return (
    <div className="app">
      <aside className="sidebar">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            go("home");
          }}
          className="brand"
        >
          <span className="brand-mark">
            <Icon name="Leaf" size={25} />
          </span>
          FitCheck<span className="brand-dot">.</span>
        </a>
        <div className="sidebar-caption">KAŽDÁ VOLBA SE POČÍTÁ</div>
        <nav>
          {nav.map((n) => (
            <button
              key={n.id}
              className={page === n.id ? "active" : ""}
              onClick={() => go(n.id)}
            >
              <Icon name={n.icon} />
              {n.label}
              {n.id === "favorites" &&
                foods.filter((f) => f.favorite).length > 0 && (
                  <small>{foods.filter((f) => f.favorite).length}</small>
                )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className={page === "settings" ? "active" : ""}
            onClick={() => go("settings")}
          >
            <Icon name="Settings" />
            Nastavení
          </button>
          <button onClick={() => go("install")}>
            <Icon name="Smartphone" />
            Aplikace do telefonu
            <Icon name="ArrowUpRight" size={16} />
          </button>
          <div className="sidebar-footer">
            <span className="status-dot" />
            Bez účtu. Jen pro tebe.
          </div>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <span>FitCheck 3.0 · katalog, recepty a rychlý zápis</span>
          <div>
            <span className="private-label">
              <Icon name="ShieldCheck" size={16} />
              Soukromí na prvním místě
            </span>
            <button
              className="icon-button"
              aria-label="Přepnout barevný režim"
              onClick={() =>
                setProfile({
                  ...profile,
                  theme: profile.theme === "light" ? "dark" : "light",
                })
              }
            >
              <Icon name={profile.theme === "light" ? "Moon" : "Sun"} />
            </button>
            <button
              className="avatar"
              onClick={() => go("settings")}
              aria-label="Tvůj profil"
            >
              TY
            </button>
          </div>
        </header>
        <main>
          {!online && (
            <div className="notice">
              <Icon name="WifiOff" />
              Jsi offline. Uložené potraviny a ruční hodnocení jsou stále
              dostupné.
            </div>
          )}
          {message && (
            <div className="notice" role="status">
              {message}
              <button
                className="icon-button"
                onClick={() => setMessage("")}
                aria-label="Skrýt zprávu"
              >
                <Icon name="X" size={16} />
              </button>
            </div>
          )}
          {!profile.onboarded ? (
            <Profile
              profile={profile}
              onChange={setProfile}
              onDone={() => setProfile({ ...profile, onboarded: true })}
            />
          ) : (
            <>
              {page === "home" && (
                <Home
                  profile={profile}
                  foods={libraryFoods(foods)}
                  entries={entries}
                  date={date}
                  targets={selectedTargets}
                  onDate={setDate}
                  onFind={() => go("search")}
                  onDiary={() => go("diary")}
                  onSettings={() => go("settings")}
                  onFood={openFood}
                  onManual={() => go("manual")}
                  onRecommend={(f) => setAdd({ food: f, meal: "snack" })}
                />
              )}
              {page === "diary" && (
                <Diary
                  profile={profile}
                  date={date}
                  onDate={setDate}
                  entries={entries}
                  days={days}
                  targets={selectedTargets}
                  foods={foods}
                  onFavorite={favorite}
                  onRecipeSave={async (f) => {
                    await putFood(f);
                    await refresh();
                    setMessage(
                      "Recept je uložený v tomto zařízení. Dřívější záznamy zůstaly zachované.",
                    );
                  }}
                  onRemoveFood={async (id) => {
                    await deleteFood(id);
                    await refresh();
                  }}
                  onRepeat={setRepeat}
                  onEdit={(e) =>
                    setAdd({ food: e.food, meal: e.meal, entry: e })
                  }
                  onDelete={deleteMeal}
                  onPick={(food, meal) => setAdd({ food, meal })}
                  onFind={(meal) => {
                    setPendingMeal(meal);
                    go("search");
                  }}
                  onOpen={(e) => openFood(e.food)}
                />
              )}
              {page === "search" && (
                <>
                  <div className="eyebrow">OD OBALU K ODPOVĚDI</div>
                  <h1>Najdi svoji potravinu.</h1>
                  <section className="card search-card">
                    <div className="tabs">
                      <button
                        className={mode === "name" ? "active" : ""}
                        onClick={() => setMode("name")}
                      >
                        Podle názvu
                      </button>
                      <button
                        className={mode === "barcode" ? "active" : ""}
                        onClick={() => setMode("barcode")}
                      >
                        Čárový kód
                      </button>
                    </div>
                    <form
                      className="search-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        find();
                      }}
                    >
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        inputMode={mode === "barcode" ? "numeric" : "search"}
                        aria-label={
                          mode === "name" ? "Název potraviny" : "Čárový kód"
                        }
                        placeholder={
                          mode === "name"
                            ? "Např. bílý jogurt, ovesné vločky…"
                            : "Zadej číslice pod čárovým kódem"
                        }
                        required
                      />
                      <button className="button" disabled={busy}>
                        {busy ? "Hledám…" : "Vyhledat"}
                        <Icon name="Search" />
                      </button>
                    </form>
                    <div className="action-row">
                      <button
                        className="button secondary"
                        onClick={() => setScan(true)}
                      >
                        <Icon name="ScanLine" />
                        Spustit kameru
                      </button>
                      <button
                        className="text-button"
                        onClick={() => go("manual")}
                      >
                        <Icon name="ClipboardPen" />
                        Přidat ručně
                      </button>
                    </div>
                    <p className="fine">
                      Zdroj Open Food Facts · Hledání až po odeslání. Při
                      výpadku hledáme v uložených potravinách.
                    </p>
                    {mode === "name" && query.trim().length >= 3 && (
                      <a
                        className="text-button"
                        href={
                          "https://world.openfoodfacts.org/cgi/search.pl?search_terms=" +
                          encodeURIComponent(query) +
                          "&search_simple=1&action=process"
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        Otevřít hledání na webu Open Food Facts ↗
                      </a>
                    )}
                  </section>
                  {results.length > 0 && (
                    <>
                      <h2>Výsledky hledání</h2>
                      {cards(results)}
                    </>
                  )}
                </>
              )}
              {page === "manual" && <Manual onSave={openFood} />}
              {page === "edit" && active && (
                <Manual
                  key={active.id}
                  initial={active}
                  onSave={async (f) => {
                    await openFood(f);
                    if (correctionEntry) {
                      await persistEntry({
                        ...correctionEntry,
                        food: structuredClone(f),
                        updatedAt: new Date().toISOString(),
                      });
                      setCorrectionEntry(null);
                    }
                  }}
                  onCancel={() => {
                    setCorrectionEntry(null);
                    go("result");
                  }}
                />
              )}
              {page === "result" && active && (
                <Result
                  food={active}
                  goal={profile.goal}
                  profile={profile}
                  onFavorite={() => favorite(active)}
                  onEdit={() => go("edit")}
                  onAdd={() => setAdd({ food: active, meal: pendingMeal })}
                  todayEntries={entries.filter((e) => e.day === today)}
                  targets={plan.targets}
                  onCompare={async () => {
                    await putFood(active);
                    await refresh();
                    setSelected((prev) => [
                      ...prev.filter((x) => x !== active.id).slice(-1),
                      active.id,
                    ]);
                    go("compare");
                  }}
                  onPortion={async (v) => {
                    const f = applyCorrections(active, {
                      name: active.name,
                      category: active.category,
                      unit: active.unit,
                      portion: v,
                      nutrients: active.nutrients,
                    });
                    setActive(f);
                    if (f.source !== "demo") {
                      await putFood(f);
                      refresh();
                    }
                  }}
                />
              )}
              {(page === "history" || page === "favorites") && (
                <>
                  <div className="eyebrow">TVOJE POTRAVINY PO RUCE</div>
                  <h1>
                    {page === "history"
                      ? "Historie hodnocení"
                      : "Oblíbené potraviny"}
                  </h1>
                  <p>Výsledky se automaticky přepočítávají pro aktuální cíl.</p>
                  {cards(
                    page === "favorites"
                      ? foods.filter((f) => f.favorite)
                      : foods,
                  )}
                </>
              )}
              {page === "compare" && (
                <Compare
                  foods={foods}
                  goal={profile.goal}
                  profile={profile}
                  selected={selected}
                  onSelect={setSelected}
                />
              )}
              {page === "settings" && (
                <>
                  <h1>Všechno podle tebe.</h1>
                  <Profile profile={profile} onChange={setProfile} />
                  <TargetSettings profile={profile} onChange={setProfile} />
                  <section className="card settings-card">
                    <h2>Vzhled a data</h2>
                    <button
                      className="button secondary"
                      onClick={async () => {
                        try {
                          const registration =
                            await navigator.serviceWorker?.getRegistration();
                          if (!registration)
                            throw Error(
                              "PWA zatím není zaregistrovaná. Obnov stránku po prvním načtení.",
                            );
                          await registration.update();
                          setMessage(
                            "Kontrola aktualizace byla spuštěna. Pokud se zobrazí výzva k nové verzi, klepni na ni. Uložená data se nemažou.",
                          );
                        } catch (err) {
                          setMessage((err as Error).message);
                        }
                      }}
                    >
                      Zkontrolovat aktualizaci aplikace
                    </button>
                    <button
                      className="button secondary"
                      onClick={() =>
                        setProfile({
                          ...profile,
                          theme: profile.theme === "light" ? "dark" : "light",
                        })
                      }
                    >
                      <Icon name="Sun" />
                      Přepnout {profile.theme === "light"
                        ? "tmavý"
                        : "světlý"}{" "}
                      režim
                    </button>
                    <p>
                      Data se ukládají pouze do tohoto prohlížeče. Automatická
                      synchronizace mezi zařízeními neprobíhá. Záloha obsahuje i
                      nepovinné osobní údaje.
                    </p>
                    <div className="action-row">
                      <button
                        className="button secondary"
                        onClick={async () => {
                          try {
                            const records = await exportRecords();
                            const blob = new Blob(
                              [
                                JSON.stringify(
                                  { version: 3, profile, ...records },
                                  null,
                                  2,
                                ),
                              ],
                              { type: "application/json" },
                            );
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = "fitcheck-zaloha.json";
                            a.click();
                            setTimeout(() => URL.revokeObjectURL(url), 1000);
                          } catch {
                            setMessage(
                              "Zálohu nelze přečíst z úložiště. Zkus to znovu.",
                            );
                          }
                        }}
                      >
                        <Icon name="Download" />
                        Exportovat zálohu
                      </button>
                      <label className="button secondary import-button">
                        Importovat zálohu
                        <input
                          type="file"
                          accept="application/json,.json"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              if (file.size > 10 * 1024 * 1024)
                                throw Error(
                                  "Záloha je příliš velká (max. 10 MB).",
                                );
                              const b = parseBackup(await file.text());
                              const conflicts = await importConflicts(
                                b.foods,
                                b.entries,
                                b.days,
                              );
                              if (
                                conflicts &&
                                !window.confirm(
                                  `Záloha mění ${conflicts} existujících záznamů. Přepsat je? Před importem se uloží místní obnovovací kopie.`,
                                )
                              ) {
                                e.target.value = "";
                                return;
                              }
                              await importRecords(
                                b.foods,
                                b.entries,
                                b.days,
                                conflicts > 0,
                              );
                              await refreshDiary();
                              setProfile(b.profile);
                              await refresh();
                              setMessage(
                                "Záloha byla importována. Předchozí stav je v obnovovací kopii; shodné záznamy se neduplikují.",
                              );
                            } catch (err) {
                              setMessage((err as Error).message);
                            }
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                    <div className="action-row">
                      <button
                        className="text-button danger"
                        onClick={async () => {
                          if (
                            window.confirm(
                              "Vymazat celou historii včetně oblíbených?",
                            )
                          ) {
                            await clearFoods();
                            setFoods([]);
                            setActive(null);
                          }
                        }}
                      >
                        Vymazat historii
                      </button>
                      <button
                        className="text-button danger"
                        onClick={async () => {
                          if (
                            window.confirm(
                              "Smazat profil, denní cíle, jídelníčky, historii, oblíbené a cache potravin?",
                            )
                          ) {
                            await clearAll();
                            setSelected([]);
                            setResults([]);
                            setAdd(null);
                            setDate(dayKey());
                            setEntries([]);
                            setDays([]);
                            setFoods([]);
                            setActive(null);
                            setProfile({ ...loadProfile() });
                          }
                        }}
                      >
                        Vymazat všechna osobní data
                      </button>
                    </div>
                    <details>
                      <summary>Obnovovací kopie dat</summary>
                      <p className="fine">
                        Kopie zůstávají pouze v tomto prohlížeči. Stáhni JSON a
                        případně jej načti přes Importovat zálohu. Kopie před
                        aktualizací se nepřepisuje; další dvě obsahují stav před
                        poslední příslušnou operací. Vymazání všech osobních dat
                        odstraní i tyto kopie.
                      </p>
                      <div className="action-row">
                        {[
                          ["before-fitcheck-3", "Před aktualizací"],
                          ["before-import", "Před posledním importem"],
                          ["before-history-clear", "Před smazáním historie"],
                        ].map(([id, label]) => (
                          <button
                            key={id}
                            className="button secondary"
                            onClick={async () => {
                              try {
                                const recovery = await readRecovery(id);
                                if (!recovery) {
                                  setMessage(
                                    "Tato obnovovací kopie zatím nevznikla.",
                                  );
                                  return;
                                }
                                const url = URL.createObjectURL(
                                  new Blob(
                                    [JSON.stringify(recovery.backup, null, 2)],
                                    { type: "application/json" },
                                  ),
                                );
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = `fitcheck-${id}.json`;
                                a.click();
                                setTimeout(
                                  () => URL.revokeObjectURL(url),
                                  1000,
                                );
                              } catch {
                                setMessage("Obnovovací kopii nelze načíst.");
                              }
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </details>
                  </section>
                  <section className="card">
                    <h2>O FitChecku</h2>
                    <p>
                      Verze 3.0 – katalog, recepty a rychlý zápis · Orientační
                      pravidlové hodnocení. Nevypovídá o zdravotní vhodnosti pro
                      onemocnění ani alergie. Rozhoduje celý jídelníček, nikoliv
                      jeden výrobek.
                    </p>
                    <p>
                      80 % kategoriální kvalita + 20 % osobní vhodnost porce;
                      nápoje bez bonusu za nízkou energii. Hodnocené oblasti:
                      bílkoviny, vláknina, sůl, nasycené tuky, cukry a
                      energetická hustota. Pravidla upravují kategorii olejů,
                      ořechů, ovoce, mléčných výrobků a nápojů. Chybějící
                      hodnoty se nepočítají jako nula.
                    </p>
                    <p>
                      Podklady:{" "}
                      <a
                        href="https://www.who.int/news-room/fact-sheets/detail/healthy-diet"
                        target="_blank"
                        rel="noreferrer"
                      >
                        WHO – Healthy diet
                      </a>
                      . Vlastní bodové prahy jsou heuristika FitCheck, nikoliv
                      validovaný výživový standard.
                    </p>
                    <p>
                      Databáze:{" "}
                      <a
                        href="https://world.openfoodfacts.org"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open Food Facts a přispěvatelé
                      </a>{" "}
                      ·{" "}
                      <a href="https://opendatacommons.org/licenses/odbl/1-0/">
                        ODbL
                      </a>{" "}
                      (databáze), DbCL (jednotlivý obsah), CC BY-SA
                      (fotografie). Zálohy zachovávají původ produktů; při
                      dalším sdílení respektuj licence.
                    </p>
                  </section>
                </>
              )}
              {page === "install" && (
                <section className="card form-card">
                  <div className="eyebrow">V KAPSE. I BEZ SIGNÁLU.</div>
                  <h1>FitCheck vždy po ruce.</h1>
                  <p>
                    Po prvním online načtení funguje rozhraní, ruční hodnocení i
                    uložené potraviny offline. Vyhledávání nových výrobků
                    vyžaduje internet.
                  </p>
                  <h2>Android</h2>
                  <p>
                    Otevři aplikaci v Chrome. V nabídce prohlížeče vyber
                    „Nainstalovat aplikaci“ nebo „Přidat na plochu“.
                  </p>
                  {install && (
                    <button
                      className="button"
                      onClick={async () => {
                        await install.prompt();
                        await install.userChoice;
                        setInstall(null);
                      }}
                    >
                      <Icon name="Download" />
                      Nainstalovat FitCheck
                    </button>
                  )}
                  <h2>iPhone</h2>
                  <p>
                    Otevři aplikaci v Safari. Klepni na Sdílet, potom „Přidat na
                    plochu“ a potvrď „Přidat“.
                  </p>
                  <p className="notice">
                    Kamera a instalace vyžadují HTTPS. GitHub Pages jej
                    poskytuje zdarma. Na počítači lze používat localhost.
                  </p>
                </section>
              )}
            </>
          )}
          <footer>
            FitCheck<span className="green">.</span>
            <span>Malé volby. Dlouhodobý rozdíl.</span>
            <button className="text-button" onClick={() => go("settings")}>
              O aplikaci
            </button>
          </footer>
        </main>
      </div>
      <nav className="mobile-nav">
        {nav.slice(0, 3).map((n) => (
          <button
            key={n.id}
            className={page === n.id ? "active" : ""}
            onClick={() => go(n.id)}
          >
            <Icon name={n.icon} />
            <span>{n.id === "search" ? "Hledat" : n.label}</span>
          </button>
        ))}
        <button onClick={() => setMore(!more)} aria-expanded={more}>
          <Icon name="Menu" />
          <span>Další</span>
        </button>
      </nav>
      {more && (
        <div className="mobile-more">
          {[
            ...nav.slice(3),
            {
              id: "settings" as Page,
              label: "Nastavení",
              icon: "Settings" as IconName,
            },
            {
              id: "install" as Page,
              label: "Aplikace do telefonu",
              icon: "Smartphone" as IconName,
            },
          ].map((n) => (
            <button key={n.id} onClick={() => go(n.id)}>
              <Icon name={n.icon} />
              {n.label}
            </button>
          ))}
        </div>
      )}
      {repeat && (
        <RepeatMeal
          entries={repeat}
          day={date}
          onSave={persistGroup}
          onClose={() => setRepeat(null)}
        />
      )}
      {add && (
        <AddToDay
          food={add.food}
          day={date}
          initialMeal={add.meal}
          entry={add.entry}
          onClose={() => setAdd(null)}
          onSave={persistEntry}
          onComplete={() => {
            setCorrectionEntry(add.entry ?? null);
            setActive(add.food);
            setAdd(null);
            go("edit");
          }}
        />
      )}
      {scan && (
        <Suspense
          fallback={<div className="modal-backdrop">Spouštím kameru…</div>}
        >
          <Scanner
            onClose={() => {
              setScan(false);
              setMode("barcode");
              go("search");
            }}
            onCode={(code) => {
              setScan(false);
              setQuery(code);
              setMode("barcode");
              go("search");
              find(code, "barcode");
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
