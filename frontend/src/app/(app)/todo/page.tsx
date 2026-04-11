import type { Metadata } from "next";

import { roadmapTasks } from "../../../types/api";

export const metadata: Metadata = {
  title: "Roadmap",
  description: "Track the implementation progress and upcoming features for Merewa.",
};

export default function TodoPage() {
  return (
    <div className="page-stack">
      <section className="glass-panel search-hero">
        <span className="eyebrow">Roadmap</span>
        <h1>Implementation task list</h1>
        <p>
          This is the active product checklist for finishing the remaining
          production polish after the current auth, profile, and search work.
        </p>
      </section>

      <section className="todo-grid">
        {roadmapTasks.map((task) => (
          <article key={task.title} className={`todo-card ${task.status} glass-panel`}>
            <span className="todo-state">{task.status}</span>
            <h3>{task.title}</h3>
            <p>{task.detail}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
