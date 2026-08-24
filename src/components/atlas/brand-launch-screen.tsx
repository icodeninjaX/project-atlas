import Image from "next/image";
import { BrandLaunchDialogue } from "./brand-launch-dialogue";

export function BrandLaunchScreen() {
  return (
    <div aria-hidden="true" className="atlas-launch-screen">
      <div className="atlas-launch-content">
        <div className="atlas-launch-core">
          <span className="atlas-launch-pulse" />
          <Image
            src="/brand/atlas-system-core-launch.png"
            alt=""
            width={144}
            height={144}
            className="atlas-launch-logo"
            draggable={false}
            preload
            unoptimized
          />
        </div>
        <BrandLaunchDialogue />
      </div>
    </div>
  );
}
