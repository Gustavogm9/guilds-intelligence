import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Img,
    Link,
    Preview,
    Section,
    Text,
} from "@react-email/components";
import * as React from "react";

interface ReportReadyEmailProps {
    companyName: string;
    reportTitle: string;
    actionUrl: string;
    language: "pt-BR" | "en-US";
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.myurbanai.com";

export const ReportReadyEmail = ({
    companyName,
    reportTitle,
    actionUrl,
    language,
}: ReportReadyEmailProps) => {
    const isPt = language === "pt-BR";

    const previewText = isPt
        ? `Seu novo relatório de inteligência para ${companyName} está pronto.`
        : `Your new intelligence report for ${companyName} is ready.`;

    const heading = isPt ? "Relatório Finalizado" : "Report Ready";
    
    const intro = isPt 
        ? `Olá! O seu mais recente relatório de inteligência "${reportTitle}" acabou de ser processado pelo nosso motor e já está disponível em sua dashboard.`
        : `Hello! Your latest intelligence report "${reportTitle}" has just been processed by our engine and is now available on your dashboard.`;

    const cta = isPt ? "Visualizar Relatório" : "View Report";

    const footerText = isPt
        ? "Você está recebendo este e-mail pois é assinante do Guilds Intelligence. Caso tenha dúvidas, responda diretamente a esta mensagem."
        : "You are receiving this email because you subscribe to Guilds Intelligence. If you have any questions, reply directly to this message.";

    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={header}>
                        {/* Podemos adicionar a URL correta do logo posteriormente */}
                        <Text style={logoText}>Guilds Intelligence</Text>
                    </Section>
                    
                    <Heading style={h1}>{heading}</Heading>
                    
                    <Text style={text}>{intro}</Text>
                    
                    <Section style={btnContainer}>
                        <Button style={button} href={(baseUrl + actionUrl).replace("app.myurbanai.com/dashboard", "app.myurbanai.com/api/auth/login?redirect=" + encodeURIComponent(actionUrl))}>
                            {cta}
                        </Button>
                    </Section>
                    
                    <Hr style={hr} />
                    
                    <Text style={footer}>
                        {footerText}
                    </Text>
                </Container>
            </Body>
        </Html>
    );
};

export default ReportReadyEmail;

const main = {
    backgroundColor: "#f6f9fc",
    fontFamily:
        '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
    backgroundColor: "#ffffff",
    margin: "0 auto",
    padding: "20px 0 48px",
    marginBottom: "64px",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
};

const header = {
    padding: "0 48px",
    marginBottom: "24px",
};

const logoText = {
    color: "#0f172a",
    fontSize: "20px",
    fontWeight: "bold",
    margin: "0",
};

const h1 = {
    color: "#0f172a",
    fontSize: "24px",
    fontWeight: "600",
    lineHeight: "40px",
    margin: "0 0 20px",
    padding: "0 48px",
};

const text = {
    color: "#334155",
    fontSize: "16px",
    lineHeight: "26px",
    padding: "0 48px",
};

const btnContainer = {
    textAlign: "center" as const,
    marginTop: "32px",
    marginBottom: "32px",
};

const button = {
    backgroundColor: "#0f172a",
    borderRadius: "6px",
    color: "#fff",
    fontSize: "16px",
    textDecoration: "none",
    textAlign: "center" as const,
    display: "inline-block",
    padding: "12px 24px",
};

const hr = {
    borderColor: "#e2e8f0",
    margin: "20px 0",
};

const footer = {
    color: "#64748b",
    fontSize: "14px",
    lineHeight: "22px",
    padding: "0 48px",
};
