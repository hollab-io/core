import { motion } from "framer-motion";

import DynamicAuthControl from "../components/DynamicAuthControl";

export default function WelcomeScreen() {
    return (
        <section className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-[#E8F3EE]">
            {/* The beautiful generated background image */}
            <div className="absolute inset-0 z-0 bg-[url('/hero-bg.png')] bg-cover bg-center bg-no-repeat opacity-90 transition-opacity duration-1000" />

            {/* Elegant glassmorphism overlay to ensure text is readable while looking premium */}
            <div className="absolute inset-0 z-10 bg-gradient-to-b from-white/20 via-white/5 to-[#052e16]/30 backdrop-blur-[2px]" />

            <div className="relative z-20 flex w-full max-w-7xl flex-col items-center justify-center px-6">
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    className="flex max-w-2xl flex-col items-center text-center"
                >
                    <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] border border-white/40 bg-white/30 text-5xl font-light text-emerald-900 shadow-[0_8px_32px_rgba(34,197,94,0.15)] backdrop-blur-xl">
                        h
                    </div>

                    <h1 className="text-balance text-5xl font-semibold tracking-tight text-white drop-shadow-md sm:text-7xl">
                        Welcome to Holaspirit
                    </h1>

                    <p className="mt-8 text-balance text-lg font-medium leading-relaxed text-white/90 drop-shadow-sm sm:text-xl">
                        Connect your wallet to enter the decentralized workspace where strategy,
                        execution, and organization design live together.
                    </p>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        className="mt-12 overflow-hidden rounded-[2rem] border border-white/30 bg-white/20 p-2 shadow-[0_16px_40px_rgba(0,0,0,0.1)] backdrop-blur-2xl"
                    >
                        <div className="rounded-[1.5rem] bg-white/90 px-8 py-8 shadow-inner sm:px-12 sm:py-10">
                            <h2 className="mb-6 text-xl font-semibold text-slate-800">
                                Get Started
                            </h2>
                            {/* This uses DynamicAuthControl which will display the wallet connection UI */}
                            <div className="flex w-full min-w-[280px] justify-center scale-110">
                                <DynamicAuthControl />
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
