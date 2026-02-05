"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@iconify/react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

// Animation variants
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
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
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary-50 to-background z-0" />

          {/* Animated circles */}
          <motion.div
            className="absolute top-20 right-20 w-64 h-64 rounded-full bg-primary-100 opacity-30 z-0"
            animate={{
              scale: [0.8, 1.2, 0.8],
              opacity: [0, 0.3, 0],
              x: [0, 30, 0],
              y: [0, -30, 0],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          <motion.div
            className="absolute bottom-20 left-20 w-96 h-96 rounded-full bg-secondary-100 opacity-20 z-0"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0, 0.2, 0],
              x: [0, -40, 0],
              y: [0, 40, 0],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2,
            }}
          />

          <div className="container mx-auto px-4 py-16 lg:py-24 relative z-10">
            <motion.div
              className="max-w-4xl mx-auto text-center"
              initial="hidden"
              animate="visible"
              variants={stagger}
            >
              <motion.div
                variants={fadeUp}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-700 mb-6">
                  <Icon icon="lucide:trending-up" className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Croissance Commerciale
                  </span>
                </div>
              </motion.div>

              <motion.h1
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight"
                variants={fadeUp}
                transition={{
                  duration: 0.6,
                  delay: 0.1,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                Les ventes sont le département avec le plus gros{" "}
                <span className="text-primary">potentiel de croissance</span>{" "}
                dormante.
              </motion.h1>

              <motion.div
                className="space-y-2 mb-8"
                variants={fadeUp}
                transition={{
                  duration: 0.6,
                  delay: 0.2,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <p className="text-lg text-foreground-500">
                  Parce que les décisions sont prises sans preuve
                </p>
                <p className="text-lg text-foreground-500">
                  et le coaching se fait encore au feeling.
                </p>
              </motion.div>

              <motion.p
                className="text-foreground-500 mb-8 max-w-2xl mx-auto"
                variants={fadeUp}
                transition={{
                  duration: 0.6,
                  delay: 0.3,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                Aujourd&apos;hui, dans la majorité des équipes commerciales, on
                pilote avec quelques écoutes d&apos;appels, des ressentis, et
                beaucoup d&apos;hypothèses.{" "}
                <span className="font-semibold text-foreground">
                  Les équipes qui progressent vraiment fonctionnent autrement.
                </span>
              </motion.p>

              <motion.div
                className="flex flex-wrap gap-4 justify-center"
                variants={fadeUp}
                transition={{
                  duration: 0.6,
                  delay: 0.4,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <Button
                  as="a"
                  href="/sign-up"
                  color="primary"
                  size="lg"
                  className="font-medium"
                  startContent={<Icon icon="lucide:zap" className="w-4 h-4" />}
                >
                  Activer SuperSales — 47€/mois
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Main content sections */}
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            {/* La Réalité Section */}
            <section className="py-20">
              <motion.div
                className="max-w-4xl mx-auto"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={stagger}
              >
                <motion.h2
                  className="text-3xl md:text-4xl font-bold text-foreground mb-4"
                  variants={fadeUp}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  Ce n&apos;est pas une stratégie.
                  <br />
                  <span className="text-primary">
                    C&apos;est une approximation tolérée.
                  </span>
                </motion.h2>

                <motion.div
                  className="grid md:grid-cols-2 gap-12 mt-12"
                  variants={fadeUp}
                  transition={{
                    duration: 0.6,
                    delay: 0.2,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <Card className="p-6 border border-default-100">
                    <p className="text-foreground-500 mb-4">
                      Dans la plupart des équipes commerciales :
                    </p>
                    <ul className="space-y-3">
                      {[
                        'on écoute quelques appels "exemples"',
                        "on coach selon l'expérience ou l'intuition",
                        "on suppose savoir ce qui marche",
                        "on répète les mêmes erreurs sans le voir",
                      ].map((item, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-3 text-foreground"
                        >
                          <Icon
                            icon="lucide:minus"
                            className="w-4 h-4 text-foreground-400 mt-1 shrink-0"
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>

                  <div className="flex items-center">
                    <div>
                      <p className="text-xl text-foreground-500">
                        Tant que l&apos;équipe est petite, ça passe.
                      </p>
                      <p className="text-xl font-semibold text-foreground mt-2">
                        Dès qu&apos;elle grandit, ça coûte cher.
                      </p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </section>

            {/* Renversement de Croyance Section */}
            <section className="py-20 border-t border-border">
              <motion.div
                className="max-w-4xl mx-auto"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={stagger}
              >
                <motion.h2
                  className="text-3xl md:text-4xl font-bold text-foreground mb-8"
                  variants={fadeUp}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  Le problème n&apos;est pas le talent.
                  <br />
                  <span className="text-primary">
                    C&apos;est l&apos;absence de feedback objectif.
                  </span>
                </motion.h2>

                <motion.div
                  className="space-y-8"
                  variants={fadeUp}
                  transition={{
                    duration: 0.6,
                    delay: 0.2,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <div className="flex flex-wrap gap-4 text-foreground-500">
                    <span>Ce n&apos;est pas :</span>
                    <span className="line-through">un manque de motivation</span>
                    <span className="line-through">un problème de volume</span>
                    <span className="line-through">une question d&apos;offre</span>
                  </div>

                  <Card className="p-6 border-l-4 border-l-primary border-default-100 bg-primary-50/30">
                    <p className="text-xl font-medium text-foreground">
                      Le vrai problème, c&apos;est qu&apos;il n&apos;existe pas
                      de feedback clair, constant et factuel après chaque appel.
                    </p>
                  </Card>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <Card className="p-4 border border-default-100">
                      <p className="text-foreground-500 mb-3">Sans preuve :</p>
                      <ul className="space-y-2 text-foreground">
                        <li className="flex items-center gap-2">
                          <Icon
                            icon="lucide:arrow-right"
                            className="w-4 h-4 text-destructive"
                          />
                          les erreurs se répètent
                        </li>
                        <li className="flex items-center gap-2">
                          <Icon
                            icon="lucide:arrow-right"
                            className="w-4 h-4 text-destructive"
                          />
                          les progrès ralentissent
                        </li>
                        <li className="flex items-center gap-2">
                          <Icon
                            icon="lucide:arrow-right"
                            className="w-4 h-4 text-destructive"
                          />
                          le coaching ne scale pas
                        </li>
                        <li className="flex items-center gap-2">
                          <Icon
                            icon="lucide:arrow-right"
                            className="w-4 h-4 text-destructive"
                          />
                          les décisions restent subjectives
                        </li>
                      </ul>
                    </Card>
                  </div>
                </motion.div>
              </motion.div>
            </section>

            {/* Nouveau Standard Section */}
            <section className="py-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 bg-primary-600 relative overflow-hidden">
              {/* Background elements */}
              <div className="absolute inset-0 overflow-hidden">
                <motion.div
                  className="absolute top-10 right-10 w-64 h-64 rounded-full bg-primary-500 opacity-20"
                  animate={{
                    scale: [1, 1.2, 1],
                    x: [0, 30, 0],
                    y: [0, -30, 0],
                  }}
                  transition={{
                    duration: 15,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <motion.div
                  className="absolute bottom-10 left-10 w-96 h-96 rounded-full bg-primary-700 opacity-20"
                  animate={{
                    scale: [1, 1.3, 1],
                    x: [0, -40, 0],
                    y: [0, 40, 0],
                  }}
                  transition={{
                    duration: 18,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 2,
                  }}
                />
              </div>

              <motion.div
                className="max-w-4xl mx-auto text-center relative z-10"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={stagger}
              >
                <motion.h2
                  className="text-3xl md:text-4xl font-bold text-white mb-6"
                  variants={fadeUp}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  Les équipes performantes fonctionnent autrement.
                </motion.h2>

                <motion.div
                  className="space-y-4 text-lg text-primary-100"
                  variants={fadeUp}
                  transition={{
                    duration: 0.6,
                    delay: 0.2,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <p>
                    On n&apos;améliore pas ce qu&apos;on n&apos;observe pas
                    précisément.
                  </p>
                  <p>
                    Les équipes qui gagnent n&apos;essaient pas de &quot;mieux
                    coacher&quot;.
                    <br />
                    <span className="text-white font-semibold">
                      Elles apprennent plus vite de chaque conversation.
                    </span>
                  </p>
                  <p className="text-white pt-4 font-medium">
                    C&apos;est ce nouveau standard que SuperSales rend
                    accessible.
                  </p>
                </motion.div>
              </motion.div>
            </section>

            {/* Cœur de la Valeur Section */}
            <section className="py-20">
              <motion.div
                className="max-w-5xl mx-auto"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={stagger}
              >
                <motion.h2
                  className="text-3xl md:text-4xl font-bold text-foreground mb-12 text-center"
                  variants={fadeUp}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  Chaque appel est analysé automatiquement.
                </motion.h2>

                <div className="grid md:grid-cols-2 gap-8">
                  {/* Pour le commercial */}
                  <motion.div
                    variants={fadeUp}
                    transition={{
                      duration: 0.6,
                      delay: 0.2,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    <Card className="p-6 border border-default-100 h-full">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-100 text-primary-700 text-sm font-medium rounded-full mb-4">
                        <Icon icon="lucide:user" className="w-4 h-4" />
                        <span>Pour le commercial</span>
                      </div>

                      <p className="text-foreground mb-4">
                        <span className="font-semibold">
                          Permettre à chaque commercial d&apos;élever son niveau
                          de performance
                        </span>
                        , améliorer son taux de conversion et identifier
                        précisément ce qui fait gagner ou perdre des ventes,
                      </p>

                      <p className="text-foreground-500">
                        grâce à un coaching constant et impartial, équivalent à
                        celui d&apos;un Head of Sales d&apos;élite — disponible
                        après chaque appel.
                      </p>
                    </Card>
                  </motion.div>

                  {/* Pour le manager */}
                  <motion.div
                    variants={fadeUp}
                    transition={{
                      duration: 0.6,
                      delay: 0.3,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    <Card className="p-6 border border-default-100 h-full">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-success-100 text-success-700 text-sm font-medium rounded-full mb-4">
                        <Icon icon="lucide:users" className="w-4 h-4" />
                        <span>Pour le manager</span>
                      </div>

                      <p className="text-foreground mb-4">
                        <span className="font-semibold">
                          Permettre aux managers de piloter la performance avec
                          des faits
                        </span>
                        , identifier les objections qui bloquent réellement les
                        ventes, comprendre les typologies de clients qui
                        convertissent, et déployer les bonnes stratégies à
                        l&apos;échelle,
                      </p>

                      <p className="text-foreground-500">
                        grâce à une vision globale, factuelle et actionnable des
                        équipes.
                      </p>
                    </Card>
                  </motion.div>
                </div>
              </motion.div>
            </section>

            {/* Screenshot Commercial Section */}
            <section className="py-16">
              <motion.div
                className="max-w-5xl mx-auto"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={stagger}
              >
                <motion.h3
                  className="text-xl md:text-2xl font-semibold mb-8 text-center text-foreground"
                  variants={fadeUp}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  Ce qu&apos;un commercial voit après chaque appel
                </motion.h3>

                <motion.div
                  className="relative rounded-xl overflow-hidden shadow-2xl border border-default-100"
                  variants={fadeUp}
                  transition={{
                    duration: 0.6,
                    delay: 0.2,
                    ease: [0.16, 1, 0.3, 1],
                  }}
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
                  className="text-center text-foreground-500 mt-6"
                  variants={fadeUp}
                  transition={{
                    duration: 0.6,
                    delay: 0.3,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  Pas un dashboard.{" "}
                  <span className="text-foreground font-medium">
                    Un feedback clair et exploitable immédiatement.
                  </span>
                </motion.p>
              </motion.div>
            </section>

            {/* Projection Commercial Section */}
            <section className="py-20 border-t border-border">
              <motion.div
                className="max-w-4xl mx-auto"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={stagger}
              >
                <motion.h2
                  className="text-3xl md:text-4xl font-bold text-foreground mb-12"
                  variants={fadeUp}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  Si tu es sérieux sur ta performance,
                  <br />
                  <span className="text-primary">
                    tu veux ce niveau de clarté.
                  </span>
                </motion.h2>

                <motion.div
                  className="grid md:grid-cols-2 gap-12"
                  variants={fadeUp}
                  transition={{
                    duration: 0.6,
                    delay: 0.2,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <div className="space-y-4">
                    <p className="text-foreground-500">
                      Après chaque appel, le commercial sait :
                    </p>
                    <ul className="space-y-3">
                      {[
                        "ce qu'il a bien fait",
                        "ce qui lui fait perdre des ventes",
                        "quelles objections il gère mal",
                        "comment s'améliorer dès le prochain call",
                      ].map((item, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-3 text-foreground"
                        >
                          <Icon
                            icon="lucide:check"
                            className="w-5 h-5 text-success-500"
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex items-center">
                    <div>
                      <p className="text-2xl text-foreground-500">
                        Pas un jugement.
                      </p>
                      <p className="text-2xl font-bold text-foreground mt-2">
                        Un miroir.
                      </p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </section>

            {/* Screenshot Manager Section */}
            <section className="py-16">
              <motion.div
                className="max-w-5xl mx-auto"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={stagger}
              >
                <motion.h3
                  className="text-xl md:text-2xl font-semibold mb-8 text-center text-foreground"
                  variants={fadeUp}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  Ce qu&apos;un manager voit, en un coup d&apos;œil
                </motion.h3>

                <motion.div
                  className="relative rounded-xl overflow-hidden shadow-2xl border border-default-100"
                  variants={fadeUp}
                  transition={{
                    duration: 0.6,
                    delay: 0.2,
                    ease: [0.16, 1, 0.3, 1],
                  }}
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
                  className="text-center text-foreground-500 mt-6"
                  variants={fadeUp}
                  transition={{
                    duration: 0.6,
                    delay: 0.3,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  Moins d&apos;opinions.{" "}
                  <span className="text-foreground font-medium">
                    Plus de décisions solides.
                  </span>
                </motion.p>
              </motion.div>
            </section>

            {/* Projection Manager Section */}
            <section className="py-20 border-t border-border">
              <motion.div
                className="max-w-4xl mx-auto"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={stagger}
              >
                <motion.h2
                  className="text-3xl md:text-4xl font-bold text-foreground mb-12"
                  variants={fadeUp}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  Piloter à l&apos;instinct{" "}
                  <span className="text-primary">
                    n&apos;est pas du leadership.
                  </span>
                </motion.h2>

                <motion.div
                  className="grid md:grid-cols-2 gap-12"
                  variants={fadeUp}
                  transition={{
                    duration: 0.6,
                    delay: 0.2,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <div className="space-y-4">
                    <p className="text-foreground-500">
                      En un coup d&apos;œil, le manager voit :
                    </p>
                    <ul className="space-y-3">
                      {[
                        "qui performe réellement",
                        "pourquoi certains closent mieux",
                        "quelles objections freinent les ventes",
                        "quelles stratégies fonctionnent",
                        "où concentrer le coaching",
                      ].map((item, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-3 text-foreground"
                        >
                          <Icon
                            icon="lucide:arrow-right"
                            className="w-5 h-5 text-primary"
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex items-center">
                    <Card className="p-6 border-l-4 border-l-primary border-default-100">
                      <p className="text-xl font-medium text-foreground">
                        Moins d&apos;opinions.
                        <br />
                        Plus de décisions solides.
                      </p>
                    </Card>
                  </div>
                </motion.div>
              </motion.div>
            </section>

            {/* Pourquoi ça Marche Section */}
            <section className="py-20 border-t border-border">
              <motion.div
                className="max-w-5xl mx-auto text-center"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={stagger}
              >
                <motion.h2
                  className="text-3xl md:text-4xl font-bold text-foreground mb-12"
                  variants={fadeUp}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  Les équipes qui gagnent n&apos;ont pas plus de talent.
                  <br />
                  <span className="text-primary">
                    Elles apprennent plus vite.
                  </span>
                </motion.h2>

                <motion.div
                  className="grid sm:grid-cols-2 md:grid-cols-4 gap-6"
                  variants={fadeUp}
                  transition={{
                    duration: 0.6,
                    delay: 0.2,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  {[
                    {
                      icon: "lucide:eye-off",
                      title: "Supprime",
                      desc: "l'aveuglement",
                    },
                    {
                      icon: "lucide:trending-up",
                      title: "Accélère",
                      desc: "la progression individuelle",
                    },
                    {
                      icon: "lucide:users",
                      title: "Rend",
                      desc: "le coaching scalable",
                    },
                    {
                      icon: "lucide:bar-chart-3",
                      title: "Transforme",
                      desc: "la vente en système mesurable",
                    },
                  ].map((item, i) => (
                    <Card
                      key={i}
                      className="p-6 border border-default-100 text-left"
                    >
                      <Icon
                        icon={item.icon}
                        className="w-8 h-8 text-primary mb-4"
                      />
                      <p className="text-xl font-bold text-foreground">
                        {item.title}
                      </p>
                      <p className="text-foreground-500">{item.desc}</p>
                    </Card>
                  ))}
                </motion.div>
              </motion.div>
            </section>

            {/* Prix Section */}
            <section className="py-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 bg-primary-600 relative overflow-hidden">
              <div className="absolute inset-0 overflow-hidden">
                <motion.div
                  className="absolute top-10 right-10 w-64 h-64 rounded-full bg-primary-500 opacity-20"
                  animate={{
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 15,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </div>

              <motion.div
                className="max-w-3xl mx-auto text-center relative z-10"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={stagger}
              >
                <motion.h2
                  className="text-3xl md:text-4xl font-bold text-white mb-6"
                  variants={fadeUp}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  47€ par utilisateur / mois. Point.
                </motion.h2>

                <motion.div
                  className="flex flex-wrap justify-center gap-6 mb-8 text-primary-100"
                  variants={fadeUp}
                  transition={{
                    duration: 0.6,
                    delay: 0.2,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <span className="flex items-center gap-2">
                    <Icon icon="lucide:check" className="w-4 h-4" />
                    Pas de setup complexe
                  </span>
                  <span className="flex items-center gap-2">
                    <Icon icon="lucide:check" className="w-4 h-4" />
                    Pas de pricing flou
                  </span>
                  <span className="flex items-center gap-2">
                    <Icon icon="lucide:check" className="w-4 h-4" />
                    Pas d&apos;usine à gaz
                  </span>
                </motion.div>

                <motion.p
                  className="text-lg text-white mb-8"
                  variants={fadeUp}
                  transition={{
                    duration: 0.6,
                    delay: 0.3,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  Un seul insight utile rembourse l&apos;outil.
                </motion.p>

                <motion.div
                  variants={fadeUp}
                  transition={{
                    duration: 0.6,
                    delay: 0.4,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <Button
                    as="a"
                    href="/sign-up"
                    size="lg"
                    className="font-medium bg-white text-primary-600"
                    startContent={<Icon icon="lucide:zap" className="w-4 h-4" />}
                  >
                    Activer SuperSales maintenant
                  </Button>
                </motion.div>
              </motion.div>
            </section>

            {/* Qualification Section */}
            <section className="py-20">
              <motion.div
                className="max-w-4xl mx-auto"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={stagger}
              >
                <motion.h2
                  className="text-3xl md:text-4xl font-bold text-foreground mb-12 text-center"
                  variants={fadeUp}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  Les équipes sérieuses se reconnaissent ici.
                </motion.h2>

                <motion.div
                  className="grid md:grid-cols-2 gap-8"
                  variants={fadeUp}
                  transition={{
                    duration: 0.6,
                    delay: 0.2,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  {/* Pour qui */}
                  <Card className="p-6 border border-default-100">
                    <h3 className="text-lg font-semibold text-foreground mb-4">
                      SuperSales est fait pour :
                    </h3>
                    <ul className="space-y-3">
                      {[
                        "équipes commerciales structurées",
                        "managers orientés performance",
                        "agences de closing",
                        "infopreneurs avec closers",
                      ].map((item, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-3 text-foreground"
                        >
                          <Icon
                            icon="lucide:check"
                            className="w-5 h-5 text-success-500"
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>

                  {/* Pas pour qui */}
                  <Card className="p-6 border border-default-100 bg-muted/30">
                    <h3 className="text-lg font-semibold text-foreground-500 mb-4">
                      SuperSales n&apos;est pas fait pour :
                    </h3>
                    <ul className="space-y-3">
                      {[
                        "équipes qui refusent la data",
                        "organisations qui coachent à l'ego",
                        "ventes sans appels clients",
                      ].map((item, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-3 text-foreground-500"
                        >
                          <Icon
                            icon="lucide:x"
                            className="w-5 h-5 text-destructive"
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </motion.div>
              </motion.div>
            </section>

            {/* CTA Final Section */}
            <section className="py-20 border-t border-border">
              <motion.div
                className="max-w-3xl mx-auto text-center"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={stagger}
              >
                <motion.h2
                  className="text-3xl md:text-4xl font-bold text-foreground mb-6"
                  variants={fadeUp}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  Les ventes évoluent.
                  <br />
                  <span className="text-primary">
                    Les équipes sérieuses aussi.
                  </span>
                </motion.h2>

                <motion.div
                  className="flex flex-col sm:flex-row items-center justify-center gap-4"
                  variants={fadeUp}
                  transition={{
                    duration: 0.6,
                    delay: 0.2,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <Button
                    as="a"
                    href="/sign-up"
                    color="primary"
                    size="lg"
                    className="font-medium"
                    startContent={<Icon icon="lucide:zap" className="w-4 h-4" />}
                  >
                    Passer à des décisions basées sur des preuves
                  </Button>
                </motion.div>

                <motion.p
                  className="mt-6 text-foreground-500"
                  variants={fadeUp}
                  transition={{
                    duration: 0.6,
                    delay: 0.3,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  Activer SuperSales — 47€ / utilisateur
                </motion.p>
              </motion.div>
            </section>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}
