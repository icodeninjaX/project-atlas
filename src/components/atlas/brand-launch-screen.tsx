import Image from "next/image";

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
      <div className="atlas-launch-identity">
        <span className="atlas-launch-mark">
          <Image
            src="/brand/atlas-system-core-launch.png"
            alt=""
            width={96}
            height={96}
            className="atlas-launch-logo"
            draggable={false}
            preload
            unoptimized
          />
        </span>
        <p className="atlas-launch-wordmark">ATLAS</p>
      </div>
    </div>
  );
}
