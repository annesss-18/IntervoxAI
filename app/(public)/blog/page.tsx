import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import { Container, PageHeader, Section } from "@/components/layout/Container";
import { Card, CardContent } from "@/components/atoms/card";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/badge";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Interview preparation and career growth articles from IntervoxAI.",
};

const upcomingTopics = [
  {
    title: "How to structure backend system design answers",
    category: "System Design",
  },
  {
    title: "Communicating tradeoffs under interview pressure",
    category: "Soft Skills",
  },
  {
    title: "Building a high-impact interview prep routine",
    category: "Strategy",
  },
];

export default function BlogPage() {
  return (
    <>
      <Section spacing="sm" className="pt-0">
        <Container>
          <PageHeader
            badge="Blog"
            title="Interview insights & guides"
            description="Tactical breakdowns and strategies for acing your technical interviews."
          />
        </Container>
      </Section>

      <Section spacing="md" className="pt-0">
        <Container>
          <div className="mb-8 rounded-xl border border-info/20 bg-info/5 p-6">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="size-4 text-info" />
              <span className="text-muted-foreground">
                <strong className="text-foreground">Coming soon.</strong>{" "}
                We&apos;re preparing practical, example-driven content focused
                on real interview scenarios.
              </span>
            </div>
          </div>

          <h2 className="mb-6 text-lg font-semibold">Upcoming topics</h2>
          <div className="grid gap-4">
            {upcomingTopics.map((topic) => (
              <Card
                key={topic.title}
                className="group transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <CardContent className="flex items-center justify-between gap-4 p-5">
                  <div className="flex items-center gap-4">
                    <Badge variant="outline">{topic.category}</Badge>
                    <span className="font-medium">{topic.title}</span>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-8">
            <Button asChild>
              <Link href="/explore">Explore Interview Templates</Link>
            </Button>
          </div>
        </Container>
      </Section>
    </>
  );
}
