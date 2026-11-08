import { LoginCard } from "./LoginCard";

/**
 * The OneSystec sign-in: the brand picture fills the screen and the form floats over its dark side (the right on a laptop or tablet,
 * centred below the logo on a phone, where the picture is tall).
 */
export function OneSystecLogin({ onSubmit }: { onSubmit: (email: string, password: string) => Promise<void> }) {
  return (
    <main
      // Upright gets a tall picture (a phone's, or the squarer one of a tablet held tall), with the form where its blank band is: a fixed share of the
      // picture's own height (it is as tall as the screen, or as the width allows when the screen is squarer), so it follows the
      // picture instead of the screen. Lying down (tablet, laptop) gets the wide picture, with the form on its dark right side.
      className="relative flex min-h-dvh justify-center overflow-y-auto bg-[#071a4a] bg-[url(/login-bg-mobile.webp)] bg-cover bg-top px-[8%] pt-[calc(max(100dvh,216.7vw)*0.35)] pb-8 portrait:sm:bg-[url(/login-bg-tablet.webp)] portrait:sm:pt-[calc(max(100dvh,150vw)*0.22)] landscape:justify-end landscape:bg-[url(/login-bg.webp)] landscape:bg-[position:center_8%] landscape:px-[4vw] landscape:pt-8 landscape:lg:px-[6vw]"
    >
      <div className="w-full max-w-md landscape:my-auto landscape:w-[min(32rem,42vw)] landscape:min-w-[22rem]">
        <LoginCard onSubmit={onSubmit} />
      </div>
    </main>
  );
}
