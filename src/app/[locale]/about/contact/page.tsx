import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Clock, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Us | Vietnam Tourism",
  description: "Reach out to the Vietnam Tourism Organization",
};

interface Channel {
  label: string;
  email: string;
  note: string;
}

interface Office {
  city: string;
  email: string;
}

export default async function ContactPage() {
  const t = await getTranslations("about");
  const contact = t.raw("contact") as {
    title: string;
    subtitle: string;
    channelsTitle: string;
    channels: Channel[];
    hoursTitle: string;
    hours: string;
    officesTitle: string;
    offices: Office[];
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-3">{contact.title}</h1>
        <p className="text-lg text-muted-foreground">{contact.subtitle}</p>
      </div>

      <div className="max-w-3xl mx-auto space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">{contact.channelsTitle}</h2>
          <div className="space-y-4">
            {contact.channels.map((channel) => (
              <div key={channel.email} className="rounded-xl border p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{channel.label}</span>
                  <a
                    href={`mailto:${channel.email}`}
                    className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    <Mail className="h-4 w-4" />
                    {channel.email}
                  </a>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{channel.note}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold mb-2">
            <Clock className="h-5 w-5" />
            {contact.hoursTitle}
          </h2>
          <p className="text-sm text-muted-foreground">{contact.hours}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">{contact.officesTitle}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {contact.offices.map((office) => (
              <div key={office.city} className="rounded-xl border p-5 text-center">
                <h3 className="font-semibold mb-2">{office.city}</h3>
                <a
                  href={`mailto:${office.email}`}
                  className="break-all text-sm text-primary hover:underline"
                >
                  {office.email}
                </a>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
