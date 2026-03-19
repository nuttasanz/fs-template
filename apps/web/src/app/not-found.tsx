import { Button, Center, Container, Stack, Text, Title } from "@mantine/core";
import Link from "next/link";

export default function NotFound() {
  return (
    <Center mih="100vh" bg="gray.0">
      <Container size="sm">
        <Stack align="center" gap="lg">
          <Title
            order={1}
            style={{ fontSize: "6rem", fontWeight: 900, lineHeight: 1 }}
            c="blue.6"
            aria-label="Error code 404"
          >
            404
          </Title>

          <Stack align="center" gap="xs">
            <Title order={2}>Page not found</Title>
            <Text c="dimmed" size="lg" ta="center" maw={420}>
              The page you are looking for does not exist or has been moved.
            </Text>
          </Stack>

          <Button
            component={Link}
            href="/"
            size="md"
            data-testid="not-found-home-button"
          >
            Back to Home
          </Button>
        </Stack>
      </Container>
    </Center>
  );
}
