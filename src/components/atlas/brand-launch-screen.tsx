import Image from "next/image";
import { BrandLaunchDialogue } from "./brand-launch-dialogue";

// Runs before the splash is parsed so it only plays on the first full load of a
// browser session instead of on every refresh or PWA reopen.
const launchOncePerSession = `try{var k="atlas-launch-seen";if(sessionStorage.getItem(k)){document.documentElement.dataset.launchSeen=""}else{sessionStorage.setItem(k,"1")}}catch(e){}`;

export function BrandLaunchScreen() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: launchOncePerSession }} />
      <BrandLaunchScreenContent />
    </>
  );
}

function BrandLaunchScreenContent() {
  return (
    <div aria-hidden="true" className="atlas-launch-screen">
      <div className="atlas-launch-content">
        <div className="atlas-launch-identity">
          <div className="atlas-launch-core">
            <span className="atlas-launch-pulse" />
            <span className="atlas-launch-spinner">
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
            </span>
          </div>
          <p className="atlas-launch-wordmark">
            {[..."ATLAS"].map((letter, index) => (
              <span
                key={`${letter}-${index}`}
                className="atlas-launch-wordmark-letter"
              >
                {letter}
              </span>
            ))}
          </p>
        </div>
        <BrandLaunchDialogue />
      </div>
    </div>
  );
}
