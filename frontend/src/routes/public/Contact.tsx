import React, { useState } from "react";
import { Container, Section } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { submitPublicContact } from "@/services/supportService";
import { PageMetadata } from "@/components/seo/PageMetadata";

export function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    category: "General Inquiry",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [ticketResult, setTicketResult] = useState<{ ticket_code: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await submitPublicContact(formData);
      if (res && res.data && res.data.ticket_code) {
        setTicketResult({ ticket_code: res.data.ticket_code });
      } else {
        throw new Error("Unable to create inquiry reference code. Please try again.");
      }
    } catch (err: any) {
      console.error("Contact submission error:", err);
      setErrorMsg(err?.response?.data?.message || err.message || "Unable to submit your inquiry at this moment. Please check your network and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Section className="py-8 sm:py-12 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <PageMetadata
        title="Contact & Support"
        description="Get in touch with the Namma Connect team for inquiries, traveler assistance, and partner host support."
      />

      <Container>
        <PageHeader
          title="Contact & Support"
          subtitle="Have a question about booking a farm stay, host verification, or partnership inquiries? Send our support concierge a message."
        />


        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
          {/* Support Information Sidebar */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="p-6 bg-white dark:bg-slate-900 rounded-3xl border-slate-200 dark:border-slate-800 space-y-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Email Inquiries</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Response within 24 business hours</p>
                  <a href="mailto:support@nammaconnect.in" className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:underline mt-1 block">
                    support@nammaconnect.in
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Host Emergency Desk</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Monday to Saturday (8 AM – 8 PM IST)</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">
                    +91 (80) 4123-8890
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Registered Office</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1">
                    Namma Connect Technologies Private Limited<br />
                    Indiranagar 100ft Road, Bengaluru, Karnataka 560038
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Interactive Contact Form */}
          <div className="lg:col-span-7">
            <Card className="p-8 bg-white dark:bg-slate-900 rounded-3xl border-slate-200 dark:border-slate-800 shadow-sm">
              {ticketResult ? (
                <div className="py-12 text-center space-y-4">
                  <div className="h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Inquiry Submitted Successfully</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">Reference Ticket: <strong className="text-emerald-700 dark:text-emerald-400">{ticketResult.ticket_code}</strong></p>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                    Thank you, <strong className="text-slate-800 dark:text-slate-200">{formData.name}</strong>. Our team has received your message regarding <em>"{formData.subject}"</em> and will reply to <strong className="text-slate-800 dark:text-slate-200">{formData.email}</strong> shortly.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setTicketResult(null);
                      setFormData({ name: "", email: "", subject: "", category: "General Inquiry", message: "" });
                    }}
                    className="mt-4 rounded-2xl font-bold"
                  >
                    Submit Another Inquiry
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {errorMsg && (
                    <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Your Full Name"
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Subject"
                      placeholder="e.g. Inquiring about coffee harvest stay"
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    />
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Inquiry Category</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="General Inquiry">General Inquiry</option>
                        <option value="Booking Support">Booking Support</option>
                        <option value="Provider Partnership">Provider Partnership</option>
                        <option value="Platform Feedback">Platform Feedback</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <Textarea
                    label="Detailed Message (Min. 10 characters)"
                    placeholder="Please write your questions or details here..."
                    rows={5}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  />

                  <Button
                    type="submit"
                    size="lg"
                    disabled={submitting}
                    className="w-full sm:w-auto font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" /> Send Inquiry
                      </>
                    )}
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
