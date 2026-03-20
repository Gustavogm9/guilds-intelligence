import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { OnboardingWizard } from "./onboarding-wizard";

export default function OnboardingPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background flex justify-center items-center"><Card className="p-8 text-sm text-muted-foreground">Carregando Guilds...</Card></div>}>
            <OnboardingWizard />
        </Suspense>
    );
}
