"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

// Animation variants
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function LandingPage() {
  return (
    <div className="lp-page min-h-screen bg-[#FAFAF9] text-[#1A1A1A] antialiased">
      {/* Custom fonts */}
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap");

        .lp-page {
          --font-display: "Instrument Serif", Georgia, serif;
          --font-body: "DM Sans", system-ui, sans-serif;
          --color-bg: #fafaf9;
          --color-text: #1a1a1a;
          --color-muted: #6b6b6b;
          --color-accent: #2563eb;
          --color-accent-hover: #1d4ed8;
        }

        .lp-page h1,
        .lp-page h2,
        .lp-page h3 {
          font-family: var(--font-display);
          font-weight: 400;
          letter-spacing: -0.02em;
          line-height: 1.1;
        }

        .lp-page p,
        .lp-page li,
        .lp-page span,
        .lp-page a {
          font-family: var(--font-body);
        }

        .lp-page .italic-serif {
          font-family: var(--font-display);
          font-style: italic;
        }
      `}</style>

      {/* Minimal Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FAFAF9]/90 backdrop-blur-sm border-b border-[#1A1A1A]/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-medium tracking-tight"
            style={{ fontFamily: "var(--font-body)" }}
          >
            SuperSales
          </Link>
          <Link
            href="/sign-up"
            className="px-5 py-2.5 bg-[#1A1A1A] text-white text-sm font-medium rounded-full hover:bg-[#333] transition-colors"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Activer SuperSales
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <motion.div
          className="max-w-4xl mx-auto text-center"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.h1
            className="text-[clamp(2.5rem,6vw,4.5rem)] mb-8 leading-[1.05]"
            variants={fadeUp}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="italic-serif">Les ventes sont le département</span>
            <br />
            <span className="italic-serif">
              avec le plus gros potentiel de croissance
            </span>
            <br />
            <span className="italic-serif">financière dormante.</span>
          </motion.h1>

          <motion.div
            className="space-y-2 mb-12"
            variants={fadeUp}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="text-xl md:text-2xl text-[#6B6B6B]">
              Parce que les décisions sont prises sans preuve
            </p>
            <p className="text-xl md:text-2xl text-[#6B6B6B]">
              et le coaching se fait encore au feeling.
            </p>
          </motion.div>

          <motion.div
            className="max-w-2xl mx-auto mb-16 space-y-4 text-lg text-[#6B6B6B]"
            variants={fadeUp}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <p>
              Aujourd&apos;hui, dans la majorité des équipes commerciales, on
              pilote avec quelques écoutes d&apos;appels, des ressentis, et
              beaucoup d&apos;hypothèses.
            </p>
            <p className="font-medium text-[#1A1A1A]">
              Les équipes qui progressent vraiment fonctionnent autrement.
            </p>
          </motion.div>

          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-3 px-8 py-4 bg-[#1A1A1A] text-white text-lg font-medium rounded-full hover:bg-[#333] transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ fontFamily: "var(--font-body)" }}
            >
              <span>Activer SuperSales</span>
              <span className="text-[#9CA3AF]">— 47€ / utilisateur / mois</span>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Divider */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="h-px bg-[#1A1A1A]/10" />
      </div>

      {/* La Réalité Section */}
      <section className="py-24 px-6">
        <motion.div
          className="max-w-4xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.h2
            className="text-[clamp(2rem,4vw,3rem)] mb-12"
            variants={fadeUp}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="italic-serif">
              Ce n&apos;est pas une stratégie.
            </span>
            <br />
            <span className="italic-serif">
              C&apos;est une approximation tolérée.
            </span>
          </motion.h2>

          <motion.div
            className="grid md:grid-cols-2 gap-12"
            variants={fadeUp}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="space-y-6">
              <p className="text-lg text-[#6B6B6B]">
                Dans la plupart des équipes commerciales :
              </p>
              <ul className="space-y-3 text-lg">
                <li className="flex items-start gap-3">
                  <span className="text-[#9CA3AF] mt-1">—</span>
                  <span>on écoute quelques appels &quot;exemples&quot;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#9CA3AF] mt-1">—</span>
                  <span>
                    on coach selon l&apos;expérience ou l&apos;intuition
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#9CA3AF] mt-1">—</span>
                  <span>on suppose savoir ce qui marche</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#9CA3AF] mt-1">—</span>
                  <span>on répète les mêmes erreurs sans le voir</span>
                </li>
              </ul>
            </div>
            <div className="flex items-center">
              <p className="text-xl md:text-2xl">
                Tant que l&apos;équipe est petite, ça passe.
                <br />
                <span className="text-[#1A1A1A] font-medium">
                  Dès qu&apos;elle grandit, ça coûte cher.
                </span>
              </p>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Divider */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="h-px bg-[#1A1A1A]/10" />
      </div>

      {/* Renversement de Croyance Section */}
      <section className="py-24 px-6">
        <motion.div
          className="max-w-4xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.h2
            className="text-[clamp(2rem,4vw,3rem)] mb-12"
            variants={fadeUp}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="italic-serif">
              Le problème n&apos;est pas le talent.
            </span>
            <br />
            <span className="italic-serif">
              C&apos;est l&apos;absence de feedback objectif.
            </span>
          </motion.h2>

          <motion.div
            className="space-y-8"
            variants={fadeUp}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex flex-wrap gap-4 text-lg text-[#6B6B6B]">
              <span>Ce n&apos;est pas :</span>
              <span className="line-through decoration-[#9CA3AF]">
                un manque de motivation
              </span>
              <span className="line-through decoration-[#9CA3AF]">
                un problème de volume
              </span>
              <span className="line-through decoration-[#9CA3AF]">
                une question d&apos;offre
              </span>
            </div>

            <p className="text-xl md:text-2xl font-medium border-l-2 border-[#1A1A1A] pl-6">
              Le vrai problème, c&apos;est qu&apos;il n&apos;existe pas de
              feedback clair, constant et factuel après chaque appel.
            </p>

            <div className="grid md:grid-cols-2 gap-6 pt-4">
              <div className="space-y-3 text-[#6B6B6B]">
                <p>Sans preuve :</p>
                <ul className="space-y-2">
                  <li>→ les erreurs se répètent</li>
                  <li>→ les progrès ralentissent</li>
                  <li>→ le coaching ne scale pas</li>
                  <li>→ les décisions restent subjectives</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Divider */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="h-px bg-[#1A1A1A]/10" />
      </div>

      {/* Nouveau Standard Section */}
      <section className="py-24 px-6 bg-[#1A1A1A] text-white">
        <motion.div
          className="max-w-4xl mx-auto text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.h2
            className="text-[clamp(2rem,4vw,3rem)] mb-8"
            variants={fadeUp}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            Les équipes performantes fonctionnent autrement.
          </motion.h2>

          <motion.div
            className="space-y-6 text-xl text-[#9CA3AF]"
            variants={fadeUp}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <p>
              On n&apos;améliore pas ce qu&apos;on n&apos;observe pas
              précisément.
            </p>
            <p>
              Les équipes qui gagnent n&apos;essaient pas de &quot;mieux
              coacher&quot;.
              <br />
              Elles{" "}
              <span className="text-white font-medium">
                apprennent plus vite de chaque conversation
              </span>
              .
            </p>
            <p className="text-white pt-4">
              C&apos;est ce nouveau standard que SuperSales rend accessible.
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* Cœur de la Valeur Section */}
      <section className="py-24 px-6">
        <motion.div
          className="max-w-4xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.h2
            className="text-[clamp(2rem,4vw,3rem)] mb-16 text-center"
            variants={fadeUp}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            Chaque appel est analysé automatiquement.
          </motion.h2>

          <div className="grid md:grid-cols-2 gap-12 md:gap-16">
            {/* Pour le commercial */}
            <motion.div
              className="space-y-6"
              variants={fadeUp}
              transition={{
                duration: 0.8,
                delay: 0.2,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#F0F9FF] text-[#0369A1] text-sm font-medium rounded-full">
                <span>🔹</span>
                <span>Pour le commercial</span>
              </div>

              <p className="text-lg leading-relaxed">
                <span className="font-medium">
                  Permettre à chaque commercial d&apos;élever son niveau de
                  performance
                </span>
                , améliorer son taux de conversion et identifier précisément ce
                qui fait gagner ou perdre des ventes,
              </p>

              <p className="text-lg text-[#6B6B6B] leading-relaxed">
                grâce à un coaching constant et impartial, équivalent à celui
                d&apos;un Head of Sales d&apos;élite — disponible après chaque
                appel.
              </p>
            </motion.div>

            {/* Pour le manager */}
            <motion.div
              className="space-y-6"
              variants={fadeUp}
              transition={{
                duration: 0.8,
                delay: 0.3,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#F0FDF4] text-[#15803D] text-sm font-medium rounded-full">
                <span>🔹</span>
                <span>Pour le manager</span>
              </div>

              <p className="text-lg leading-relaxed">
                <span className="font-medium">
                  Permettre aux managers de piloter la performance avec des
                  faits
                </span>
                , identifier les objections qui bloquent réellement les ventes,
                comprendre les typologies de clients qui convertissent, et
                déployer les bonnes stratégies à l&apos;échelle,
              </p>

              <p className="text-lg text-[#6B6B6B] leading-relaxed">
                grâce à une vision globale, factuelle et actionnable des
                équipes.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Screenshot Commercial Section */}
      <section className="py-16 px-6">
        <motion.div
          className="max-w-5xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.h3
            className="text-xl md:text-2xl font-medium mb-8 text-center"
            style={{ fontFamily: "var(--font-body)" }}
            variants={fadeUp}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            Ce qu&apos;un commercial voit après chaque appel
          </motion.h3>

          <motion.div
            className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/10 border border-[#1A1A1A]/5"
            variants={fadeUp}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <Image
              src="/lp/screenshot-commercial.png"
              alt="Rapport commercial SuperSales - Feedback après appel"
              width={1200}
              height={750}
              className="w-full h-auto"
            />
          </motion.div>

          <motion.p
            className="text-center text-[#6B6B6B] mt-6 text-lg"
            variants={fadeUp}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            Pas un dashboard.
            <br />
            <span className="text-[#1A1A1A]">
              Un feedback clair et exploitable immédiatement.
            </span>
          </motion.p>
        </motion.div>
      </section>

      {/* Divider */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="h-px bg-[#1A1A1A]/10" />
      </div>

      {/* Projection Commercial Section */}
      <section className="py-24 px-6">
        <motion.div
          className="max-w-4xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.h2
            className="text-[clamp(2rem,4vw,3rem)] mb-12"
            variants={fadeUp}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="italic-serif">
              Si tu es sérieux sur ta performance,
            </span>
            <br />
            <span className="italic-serif">tu veux ce niveau de clarté.</span>
          </motion.h2>

          <motion.div
            className="grid md:grid-cols-2 gap-12"
            variants={fadeUp}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="space-y-4">
              <p className="text-lg text-[#6B6B6B]">
                Après chaque appel, le commercial sait :
              </p>
              <ul className="space-y-3 text-lg">
                <li className="flex items-start gap-3">
                  <span className="text-[#22C55E] mt-1">✓</span>
                  <span>ce qu&apos;il a bien fait</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#22C55E] mt-1">✓</span>
                  <span>ce qui lui fait perdre des ventes</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#22C55E] mt-1">✓</span>
                  <span>quelles objections il gère mal</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#22C55E] mt-1">✓</span>
                  <span>comment s&apos;améliorer dès le prochain call</span>
                </li>
              </ul>
            </div>
            <div className="flex items-center">
              <p className="text-2xl md:text-3xl leading-tight">
                <span className="text-[#6B6B6B]">Pas un jugement.</span>
                <br />
                <span className="font-medium">Un miroir.</span>
              </p>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Screenshot Manager Section */}
      <section className="py-16 px-6 bg-[#FAFAF9]">
        <motion.div
          className="max-w-5xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.h3
            className="text-xl md:text-2xl font-medium mb-8 text-center"
            style={{ fontFamily: "var(--font-body)" }}
            variants={fadeUp}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            Ce qu&apos;un manager voit, en un coup d&apos;œil
          </motion.h3>

          <motion.div
            className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/10 border border-[#1A1A1A]/5"
            variants={fadeUp}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <Image
              src="/lp/screenshot-manager.png"
              alt="Dashboard Manager SuperSales - Vue d'ensemble performance"
              width={1200}
              height={750}
              className="w-full h-auto"
            />
          </motion.div>

          <motion.p
            className="text-center text-[#6B6B6B] mt-6 text-lg"
            variants={fadeUp}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            Moins d&apos;opinions.
            <br />
            <span className="text-[#1A1A1A]">Plus de décisions solides.</span>
          </motion.p>
        </motion.div>
      </section>

      {/* Divider */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="h-px bg-[#1A1A1A]/10" />
      </div>

      {/* Projection Manager Section */}
      <section className="py-24 px-6">
        <motion.div
          className="max-w-4xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.h2
            className="text-[clamp(2rem,4vw,3rem)] mb-12"
            variants={fadeUp}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            Piloter à l&apos;instinct n&apos;est pas du leadership.
          </motion.h2>

          <motion.div
            className="grid md:grid-cols-2 gap-12"
            variants={fadeUp}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="space-y-4">
              <p className="text-lg text-[#6B6B6B]">
                En un coup d&apos;œil, le manager voit :
              </p>
              <ul className="space-y-3 text-lg">
                <li className="flex items-start gap-3">
                  <span className="text-[#2563EB] mt-1">→</span>
                  <span>qui performe réellement</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#2563EB] mt-1">→</span>
                  <span>pourquoi certains closent mieux</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#2563EB] mt-1">→</span>
                  <span>quelles objections freinent les ventes</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#2563EB] mt-1">→</span>
                  <span>quelles stratégies fonctionnent</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#2563EB] mt-1">→</span>
                  <span>où concentrer le coaching</span>
                </li>
              </ul>
            </div>
            <div className="flex items-center">
              <p className="text-xl md:text-2xl font-medium border-l-2 border-[#2563EB] pl-6">
                Moins d&apos;opinions.
                <br />
                Plus de décisions solides.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Divider */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="h-px bg-[#1A1A1A]/10" />
      </div>

      {/* Pourquoi ça Marche Section */}
      <section className="py-24 px-6">
        <motion.div
          className="max-w-4xl mx-auto text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.h2
            className="text-[clamp(2rem,4vw,3rem)] mb-12"
            variants={fadeUp}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="italic-serif">
              Les équipes qui gagnent n&apos;ont pas plus de talent.
            </span>
            <br />
            <span className="italic-serif">Elles apprennent plus vite.</span>
          </motion.h2>

          <motion.div
            className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 text-left"
            variants={fadeUp}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {[
              { title: "Supprime", desc: "l'aveuglement" },
              { title: "Accélère", desc: "la progression individuelle" },
              { title: "Rend", desc: "le coaching scalable" },
              { title: "Transforme", desc: "la vente en système mesurable" },
            ].map((item, i) => (
              <div key={i} className="space-y-2">
                <p className="text-2xl font-medium">{item.title}</p>
                <p className="text-[#6B6B6B]">{item.desc}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Prix Section */}
      <section className="py-24 px-6 bg-[#1A1A1A] text-white">
        <motion.div
          className="max-w-4xl mx-auto text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.h2
            className="text-[clamp(2rem,4vw,3rem)] mb-8"
            variants={fadeUp}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="italic-serif">47€ par utilisateur / mois.</span>
            <br />
            <span className="italic-serif">Point.</span>
          </motion.h2>

          <motion.div
            className="flex flex-wrap justify-center gap-6 mb-12 text-[#9CA3AF]"
            variants={fadeUp}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <span>Pas de setup complexe</span>
            <span className="hidden sm:inline">·</span>
            <span>Pas de pricing flou</span>
            <span className="hidden sm:inline">·</span>
            <span>Pas d&apos;usine à gaz</span>
          </motion.div>

          <motion.p
            className="text-xl mb-10"
            variants={fadeUp}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            Un seul insight utile rembourse l&apos;outil.
          </motion.p>

          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-3 px-8 py-4 bg-white text-[#1A1A1A] text-lg font-medium rounded-full hover:bg-[#F5F5F5] transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Activer SuperSales maintenant
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Qualification Section */}
      <section className="py-24 px-6">
        <motion.div
          className="max-w-4xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.h2
            className="text-[clamp(2rem,4vw,3rem)] mb-16 text-center"
            variants={fadeUp}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            Les équipes sérieuses se reconnaissent ici.
          </motion.h2>

          <motion.div
            className="grid md:grid-cols-2 gap-12"
            variants={fadeUp}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Pour qui */}
            <div className="space-y-6">
              <h3
                className="text-xl font-medium"
                style={{ fontFamily: "var(--font-body)" }}
              >
                SuperSales est fait pour :
              </h3>
              <ul className="space-y-3 text-lg">
                <li className="flex items-start gap-3">
                  <span className="text-[#22C55E] mt-1">✓</span>
                  <span>équipes commerciales structurées</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#22C55E] mt-1">✓</span>
                  <span>managers orientés performance</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#22C55E] mt-1">✓</span>
                  <span>agences de closing</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#22C55E] mt-1">✓</span>
                  <span>infopreneurs avec closers</span>
                </li>
              </ul>
            </div>

            {/* Pas pour qui */}
            <div className="space-y-6">
              <h3
                className="text-xl font-medium text-[#6B6B6B]"
                style={{ fontFamily: "var(--font-body)" }}
              >
                SuperSales n&apos;est pas fait pour :
              </h3>
              <ul className="space-y-3 text-lg text-[#6B6B6B]">
                <li className="flex items-start gap-3">
                  <span className="text-[#EF4444] mt-1">✗</span>
                  <span>équipes qui refusent la data</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#EF4444] mt-1">✗</span>
                  <span>organisations qui coachent à l&apos;ego</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#EF4444] mt-1">✗</span>
                  <span>ventes sans appels clients</span>
                </li>
              </ul>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* CTA Final Section */}
      <section className="py-32 px-6 bg-[#FAFAF9] border-t border-[#1A1A1A]/10">
        <motion.div
          className="max-w-4xl mx-auto text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.h2
            className="text-[clamp(2rem,5vw,3.5rem)] mb-8"
            variants={fadeUp}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="italic-serif">Les ventes évoluent.</span>
            <br />
            <span className="italic-serif">Les équipes sérieuses aussi.</span>
          </motion.h2>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            variants={fadeUp}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-3 px-8 py-4 bg-[#1A1A1A] text-white text-lg font-medium rounded-full hover:bg-[#333] transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Passer à des décisions basées sur des preuves
            </Link>
          </motion.div>

          <motion.p
            className="mt-6 text-[#6B6B6B]"
            variants={fadeUp}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            Activer SuperSales — 47€ / utilisateur
          </motion.p>
        </motion.div>
      </section>

      {/* Minimal Footer */}
      <footer className="py-8 px-6 border-t border-[#1A1A1A]/10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#6B6B6B]">
          <p>© 2025 SuperSales. Tous droits réservés.</p>
          <div className="flex items-center gap-6">
            <Link
              href="/legal/privacy"
              className="hover:text-[#1A1A1A] transition-colors"
            >
              Confidentialité
            </Link>
            <Link
              href="/legal/terms"
              className="hover:text-[#1A1A1A] transition-colors"
            >
              CGU
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
