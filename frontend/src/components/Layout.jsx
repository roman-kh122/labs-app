import { AppShell, Burger, Group, Title, Button, Avatar, Text, Menu, UnstyledButton, rem } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { IconLogout, IconMap, IconSettings, IconChevronDown } from '@tabler/icons-react';

export default function Layout() {
  const [opened, { toggle }] = useDisclosure();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <AppShell
      header={{ height: 70 }}
      navbar={{ width: 250, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <IconMap size={30} color="var(--mantine-color-teal-5)" />
            <Title order={3} c="teal">EcoAir Monitor</Title>
          </Group>

          <Menu width={200} shadow="md" position="bottom-end">
            <Menu.Target>
              <UnstyledButton p="sm" style={{ borderRadius: 'var(--mantine-radius-md)', '&:hover': { backgroundColor: 'var(--mantine-color-dark-6)' } }}>
                <Group gap={7}>
                  <Avatar radius="xl" color="teal" size="sm" />
                  <Text fw={500} size="sm" lh={1} mr={3}>{user?.name || user?.email}</Text>
                  <IconChevronDown style={{ width: rem(12), height: rem(12) }} stroke={1.5} />
                </Group>
              </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Застосунок</Menu.Label>
              <Menu.Item leftSection={<IconSettings style={{ width: rem(14), height: rem(14) }} />}>
                Налаштування
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item 
                color="red" 
                leftSection={<IconLogout style={{ width: rem(14), height: rem(14) }} />}
                onClick={handleLogout}
              >
                Вийти
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Group grow align="flex-start" direction="column" gap="sm">
          <Button variant="light" color="teal" fullWidth justify="flex-start" leftSection={<IconMap size={18} />}>
            Карта екології
          </Button>
          {/* Add more nav items later if needed */}
        </Group>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
