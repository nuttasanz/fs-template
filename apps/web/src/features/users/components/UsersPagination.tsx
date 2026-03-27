'use client';

import { Group, Text, Select, Pagination } from '@mantine/core';
import type { PaginatedMeta } from '@repo/schemas';

interface UsersPaginationProps {
  meta: PaginatedMeta;
  isPending: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: string) => void;
}

export function UsersPagination({
  meta,
  isPending,
  onPageChange,
  onPageSizeChange,
}: UsersPaginationProps) {
  return (
    <Group justify="space-between" mt="md" p={12}>
      <Group>
        <Text size="sm">Rows per page</Text>
        <Select
          data={['10', '20', '50', '100']}
          value={String(meta.pageSize)}
          onChange={(val) => val && onPageSizeChange(val)}
          allowDeselect={false}
          w={80}
        />
      </Group>

      <Group gap="sm">
        <Text size="sm" c="dimmed">
          {meta.totalItems > 0
            ? `${(meta.currentPage - 1) * meta.pageSize + 1}–${Math.min(meta.currentPage * meta.pageSize, meta.totalItems)} of ${meta.totalItems}`
            : '0 items'}
        </Text>
        <Pagination
          total={meta.totalPages}
          value={meta.currentPage}
          onChange={onPageChange}
          withEdges
          disabled={isPending}
        />
      </Group>
    </Group>
  );
}
