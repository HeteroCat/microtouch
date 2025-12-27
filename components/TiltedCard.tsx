'use client';
import React, { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

interface TiltedCardProps {
    children: React.ReactNode;
    className?: string;
    containerClassName?: string;
    onClick?: () => void;
}

export default function TiltedCard({
    children,
    className = "",
    containerClassName = "",
    onClick
}: TiltedCardProps) {
    const ref = useRef<HTMLDivElement>(null);

    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // 更丝滑的弹簧参数：降低刚度、增加阻尼、增加质量感
    const springConfig = { stiffness: 150, damping: 20, mass: 0.5 };
    const mouseX = useSpring(x, springConfig);
    const mouseY = useSpring(y, springConfig);

    // 减小倾斜角度，让效果更微妙自然
    const rotateX = useTransform(mouseY, [-0.5, 0.5], ["8deg", "-8deg"]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-8deg", "8deg"]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;

        const rect = ref.current.getBoundingClientRect();

        const width = rect.width;
        const height = rect.height;

        const mouseXFromCenter = e.clientX - rect.left - width / 2;
        const mouseYFromCenter = e.clientY - rect.top - height / 2;

        const xPct = mouseXFromCenter / width;
        const yPct = mouseYFromCenter / height;

        x.set(xPct);
        y.set(yPct);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={onClick}
            style={{
                perspective: 800,
            }}
            className={containerClassName}
        >
            <motion.div
                style={{
                    rotateX,
                    rotateY,
                    transformStyle: "preserve-3d",
                    willChange: "transform",
                }}
                transition={{ type: "spring", stiffness: 150, damping: 20 }}
                className={className}
            >
                {children}
            </motion.div>
        </motion.div>
    );
}

