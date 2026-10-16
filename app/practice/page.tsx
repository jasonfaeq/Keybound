import { Suspense } from "react";
import ShortcutTrainer from "../../components/shortcut-trainer";

export default function PracticePage() {
  return (
    <Suspense
      fallback={<div className="page-loading">Loading practice...</div>}
    >
      <ShortcutTrainer />
    </Suspense>
  );
}
