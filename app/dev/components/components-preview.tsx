"use client";

import * as React from "react";
import {
  Button,
  TextInput,
  TextArea,
  Select,
  DatePicker,
  TimePicker,
  Toggle,
  Tabs,
  TabsContent,
  Modal,
  Sheet,
  ToastManagerProvider,
  useToast,
  Skeleton,
  Badge,
  PlatformBadge,
  StatusBadge,
  EmptyState,
} from "@/components/ui";
import { FileText } from "lucide-react";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="border-b pb-2 text-lg font-semibold text-foreground">{title}</h2>
      <div className="flex flex-wrap items-start gap-3">{children}</div>
    </section>
  );
}

function ToastDemo() {
  const toast = useToast();
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="primary"
        onClick={() => toast.show("Post scheduled successfully!", "success")}
      >
        Success Toast
      </Button>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => toast.show("Failed to publish post.", "error")}
      >
        Error Toast
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => toast.show("Analytics sync in progress.", "info")}
      >
        Info Toast
      </Button>
    </div>
  );
}

export function ComponentsPreview() {
  const [textVal, setTextVal] = React.useState("");
  const [areaVal, setAreaVal] = React.useState("");
  const [selectVal, setSelectVal] = React.useState("");
  const [dateVal, setDateVal] = React.useState<string | null>(null);
  const [timeVal, setTimeVal] = React.useState<string | null>(null);
  const [toggleOn, setToggleOn] = React.useState(false);
  const [tabVal, setTabVal] = React.useState("tab1");
  const [modalOpen, setModalOpen] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  return (
    <ToastManagerProvider>
      <main className="mx-auto max-w-4xl space-y-10 px-6 py-10">
        <div>
          <h1 className="text-3xl font-bold text-foreground">PostPilot — Component Library</h1>
          <p className="mt-1 text-muted-foreground">
            Shared UI primitives built on shadcn/ui + Tailwind with the PostPilot brand palette.
          </p>
        </div>

        {/* Button */}
        <Section title="Button">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="primary" size="sm">
            Small
          </Button>
          <Button variant="primary" size="lg">
            Large
          </Button>
          <Button variant="primary" loading>
            Loading
          </Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </Section>

        {/* TextInput / TextArea */}
        <Section title="TextInput / TextArea">
          <div className="w-64 space-y-3">
            <TextInput
              label="Post title"
              placeholder="Enter title…"
              value={textVal}
              onChange={(e) => setTextVal(e.target.value)}
            />
            <TextInput
              label="With error"
              placeholder="Enter value…"
              value=""
              onChange={() => {}}
              error="This field is required"
            />
            <TextArea
              label="Caption"
              placeholder="Write your caption…"
              value={areaVal}
              onChange={(e) => setAreaVal(e.target.value)}
              maxLength={2200}
              helperText="Max 2,200 characters"
            />
          </div>
        </Section>

        {/* Select */}
        <Section title="Select">
          <div className="w-64">
            <Select
              label="Platform"
              value={selectVal}
              onChange={setSelectVal}
              options={[
                { value: "youtube", label: "YouTube" },
                { value: "tiktok", label: "TikTok" },
              ]}
              placeholder="Choose platform…"
            />
          </div>
          <div className="w-64">
            <Select
              label="With error"
              value=""
              onChange={() => {}}
              options={[{ value: "opt", label: "Option" }]}
              error="Please select a platform"
            />
          </div>
        </Section>

        {/* DatePicker / TimePicker */}
        <Section title="DatePicker / TimePicker">
          <div className="w-64 space-y-3">
            <DatePicker
              label="Schedule date"
              value={dateVal}
              onChange={setDateVal}
              minDate={new Date().toISOString().split("T")[0]}
            />
            <TimePicker label="Schedule time" value={timeVal} onChange={setTimeVal} />
          </div>
        </Section>

        {/* Toggle */}
        <Section title="Toggle / Switch">
          <Toggle checked={toggleOn} onChange={setToggleOn} label="Made for kids" />
          <Toggle checked={true} onChange={() => {}} label="Allow comments" />
          <Toggle checked={false} onChange={() => {}} label="Disabled" disabled />
        </Section>

        {/* Tabs */}
        <Section title="Tabs">
          <div className="w-full">
            <Tabs
              items={[
                { id: "tab1", label: "Overview" },
                { id: "tab2", label: "YouTube" },
                { id: "tab3", label: "TikTok" },
              ]}
              value={tabVal}
              onChange={setTabVal}
            >
              <TabsContent value="tab1" className="rounded-lg border p-4">
                Overview content
              </TabsContent>
              <TabsContent value="tab2" className="rounded-lg border p-4">
                YouTube settings
              </TabsContent>
              <TabsContent value="tab3" className="rounded-lg border p-4">
                TikTok settings
              </TabsContent>
            </Tabs>
          </div>
        </Section>

        {/* Modal */}
        <Section title="Modal / Dialog">
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            Open Modal
          </Button>
          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Disconnect account?"
            footer={
              <>
                <Button variant="ghost" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={() => setModalOpen(false)}>
                  Disconnect
                </Button>
              </>
            }
          >
            <p>
              This will remove the connection to your YouTube account. You can reconnect at any time
              from the Accounts page.
            </p>
          </Modal>
        </Section>

        {/* Sheet */}
        <Section title="Sheet (Drawer)">
          <Button variant="secondary" onClick={() => setSheetOpen(true)}>
            Open Sheet (right)
          </Button>
          <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} side="right">
            <div className="space-y-3 pt-6">
              <h3 className="text-lg font-semibold">Post Details</h3>
              <p className="text-sm text-muted-foreground">Slide-in panel content goes here.</p>
            </div>
          </Sheet>
        </Section>

        {/* Toast */}
        <Section title="Toast">
          <ToastDemo />
        </Section>

        {/* Skeleton */}
        <Section title="Skeleton">
          <div className="w-64">
            <Skeleton variant="text" count={3} className="mb-1" />
          </div>
          <div className="w-64">
            <Skeleton variant="card" />
          </div>
          <div className="w-64">
            <Skeleton variant="row" count={2} />
          </div>
          <div className="w-64">
            <Skeleton variant="chart" />
          </div>
        </Section>

        {/* Badge */}
        <Section title="Badge / PlatformBadge / StatusBadge">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
          <PlatformBadge value="youtube" />
          <PlatformBadge value="tiktok" />
          <StatusBadge value="scheduled" />
          <StatusBadge value="published" />
          <StatusBadge value="draft" />
          <StatusBadge value="failed" />
          <StatusBadge value="needs_review" />
        </Section>

        {/* EmptyState */}
        <Section title="EmptyState">
          <div className="w-full">
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title="No posts yet"
              description="Create your first post and schedule it to YouTube or TikTok."
              actionLabel="Create Post"
              onAction={() => {}}
            />
          </div>
        </Section>
      </main>
    </ToastManagerProvider>
  );
}
