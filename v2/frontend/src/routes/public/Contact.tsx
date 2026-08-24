import React, { useState } from "react";
import { Container, Section } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, Send, CheckCircle2 } from "lucide-react";

export function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <Section className="py-8 sm:py-12 bg-slate-50 min-h-screen">
      <Container>
        <PageHeader
          title="Contact & Support"
          subtitle="Have a question about a farm stay, host verification, or creator partnership? Our team is here to assist."
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
          <div className="lg:col-span-5 space-y-6">
            <Card className="p-6 bg-white rounded-3xl border-slate-200 space-y-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Email Support</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Response within 24 business hours</p>
                  <a href="mailto:support@nammaconnect.in" className="text-sm font-semibold text-emerald-700 hover:underline mt-1 block">
                    support@nammaconnect.in
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Host Emergency Helpline</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Monday to Saturday (8 AM – 8 PM IST)</p>
                  <p className="text-sm font-semibold text-slate-800 mt-1">
                    +91 (80) 4123-8890
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Registered Office</h4>
                  <p className="text-xs text-slate-600 leading-relaxed mt-1">
                    Namma Connect Technologies Private Limited<br />
                    Indiranagar 100ft Road, Bengaluru, Karnataka 560038
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-7">
            <Card className="p-8 bg-white rounded-3xl border-slate-200">
              {submitted ? (
                <div className="py-12 text-center space-y-3">
                  <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Message Received</h3>
                  <p className="text-sm text-slate-600 max-w-sm mx-auto">
                    Thank you for reaching out. A coordinator will respond to <span className="font-bold text-slate-800">{formData.email}</span> within 24 hours.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setSubmitted(false)}
                    className="mt-4"
                  >
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Your Name"
                      placeholder="e.g. Rahul Sharma"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                    <Input
                      label="Email Address"
                      type="email"
                      placeholder="e.g. rahul@example.com"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <Input
                    label="Subject"
                    placeholder="e.g. Inquiring about coffee harvest stay"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  />

                  <Textarea
                    label="Message Details"
                    placeholder="Please write your inquiry here..."
                    rows={4}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  />

                  <Button type="submit" size="lg" className="w-full sm:w-auto font-bold gap-2">
                    <Send className="h-4 w-4" /> Send Message
                  </Button>
                </form>
              )}
            </Card>
          </div>
        </div>
      </Container>
    </Section>
  );
}
