"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { galleryProjects } from "@/data/wallpaper-master";

export default function ProjectGallery() {
  return (
    <section id="projects" className="bg-white py-[90px] md:py-[120px]">
      <div className="mx-auto max-w-[1260px] px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mb-10 text-center"
        >
          <h2 className="mb-3 text-[28px] font-bold text-wallpaper-heading">
            시공 사례
          </h2>
          <p className="mb-6 text-sm text-wallpaper-text">
            벽지마스터가 완성한 다양한 공간을 확인해보세요
          </p>
          <a
            href="#projects"
            className="inline-flex h-10 items-center rounded-[30px] border-2 border-wallpaper-blue px-6 text-sm font-semibold text-wallpaper-blue transition-colors hover:bg-wallpaper-blue hover:text-white"
          >
            더 알아보기
          </a>
        </motion.div>

        {/* 3-column masonry grid */}
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {galleryProjects.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="mb-4 break-inside-avoid"
            >
              <div className="group cursor-pointer overflow-hidden rounded-lg">
                <div
                  className="relative overflow-hidden"
                  style={{ height: i % 3 === 0 ? 320 : i % 3 === 1 ? 260 : 220 }}
                >
                  <Image
                    src={project.image}
                    alt={project.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    unoptimized
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <p className="mb-1 text-sm font-bold text-white">
                      {project.title}
                    </p>
                    <p className="text-xs text-white/80">
                      {project.category} | {project.area}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
