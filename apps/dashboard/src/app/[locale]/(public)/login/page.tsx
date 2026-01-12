import { EmailSignIn } from "@/components/email-sign-in";
import LoginTestimonials from "@/components/login-testimonials";
import { Icons } from "@midpoker/ui/icons";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Login | Mid Poker",
};

export default async function Page() {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Video Background */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden m-2">
        <video
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster="https://pub-842eaa8107354d468d572ebfca43b6e3.r2.dev/video-poster.jpg"
        >
          <source
            src="https://pub-842eaa8107354d468d572ebfca43b6e3.r2.dev/videos/login-video.webm"
            type="video/webm"
          />
        </video>

        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black/20" />

        {/* Logo */}
        <div className="absolute top-0 left-0 right-0 z-20">
          <div className="p-4">
            <Icons.LogoSmall className="h-6 w-auto text-white" />
          </div>
        </div>

        {/* Content overlay */}
        <div className="relative z-10 flex flex-col justify-center items-center p-2 text-center h-full w-full">
          <div className="max-w-lg">
            <LoginTestimonials />
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 lg:p-12 pb-2">
        <div className="w-full max-w-md flex flex-col h-full">
          <div className="space-y-8 flex-1 flex flex-col justify-center">
            {/* Header */}
            <div className="text-center space-y-2">
              <h1 className="text-lg mb-4 font-serif">Welcome to Mid Poker</h1>
              <p className="font-sans text-sm text-[#878787]">
                Sign in to your account to continue
              </p>
            </div>

            {/* Email Sign In */}
            <div className="flex items-center justify-center">
              <EmailSignIn />
            </div>

            {/* Sign Up Link */}
            <div className="text-center">
              <p className="font-sans text-sm text-[#878787]">
                Don't have an account?{" "}
                <Link
                  href="#"
                  className="text-foreground hover:text-[#878787] transition-colors"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </div>

          {/* Terms and Privacy Policy - Bottom aligned */}
          <div className="text-center mt-auto">
            <p className="font-sans text-xs text-[#878787]">
              By signing in you agree to our{" "}
              <Link
                href="https://mid.poker/terms"
                className="text-[#878787] hover:text-foreground transition-colors underline"
              >
                Terms of service
              </Link>{" "}
              &{" "}
              <Link
                href="https://mid.poker/policy"
                className="text-[#878787] hover:text-foreground transition-colors underline"
              >
                Privacy policy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
