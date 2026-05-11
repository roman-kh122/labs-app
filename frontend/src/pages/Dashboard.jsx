import React, { useEffect, useState } from 'react';
import { Title, Container, Grid, Card, Text, Button, Group, Table, Badge, Loader, Center, Stack, TextInput, Modal, Accordion, Box } from '@mantine/core';
import { IconRefresh, IconMapPin, IconSearch, IconInfoCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { LineChart } from '@mantine/charts';
import { useDisclosure } from '@mantine/hooks';
import api from '../api/axiosConfig';
import MapComponent from '../components/MapComponent';

export default function Dashboard() {
  const [latestData, setLatestData] = useState([]);
  const [averagesData, setAveragesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [clickedData, setClickedData] = useState(null);

  // History modal state
  const [historyOpened, { open: openHistory, close: closeHistory }] = useDisclosure(false);
  const [historyData, setHistoryData] = useState([]);
  const [historyRegionName, setHistoryRegionName] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [latestRes, avgRes] = await Promise.all([
        api.get('/pollution/latest'),
        api.get('/pollution/averages')
      ]);
      setLatestData(latestRes.data);
      setAveragesData(avgRes.data);
    } catch (err) {
      notifications.show({ title: 'Помилка', message: 'Не вдалося завантажити дані', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFetchUpdate = async () => {
    try {
      setFetching(true);
      await api.post('/pollution/fetch-all');
      notifications.show({ title: 'Успіх', message: 'Дані успішно оновлено', color: 'teal' });
      await loadData();
    } catch (err) {
      notifications.show({ title: 'Помилка', message: err.response?.data?.error || 'Помилка оновлення', color: 'red' });
    } finally {
      setFetching(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      setSearching(true);
      const res = await api.get(`/pollution/search?q=${encodeURIComponent(searchQuery)}`);
      const { lat, lon, name, pollution } = res.data;
      if (pollution && pollution.list && pollution.list.length > 0) {
        const item = pollution.list[0];
        setClickedData({
          lat, lon, region_name: name,
          aqi: item.main.aqi,
          pm2_5: item.components.pm2_5,
          pm10: item.components.pm10,
          o3: item.components.o3,
          no2: item.components.no2,
          measured_at: item.dt * 1000
        });
      }
    } catch (err) {
      notifications.show({ title: 'Помилка', message: err.response?.data?.error || 'Місто не знайдено', color: 'red' });
    } finally {
      setSearching(false);
    }
  };

  const handleMapClick = async (lat, lon) => {
    try {
      const res = await api.get(`/pollution/current?lat=${lat}&lon=${lon}`);
      if (res.data && res.data.list && res.data.list.length > 0) {
        const item = res.data.list[0];
        setClickedData({
          lat, lon, region_name: `Точка (${lat.toFixed(4)}, ${lon.toFixed(4)})`,
          aqi: item.main.aqi,
          pm2_5: item.components.pm2_5,
          pm10: item.components.pm10,
          o3: item.components.o3,
          no2: item.components.no2,
          measured_at: item.dt * 1000
        });
      }
    } catch (err) {
      notifications.show({ title: 'Помилка', message: 'Не вдалося отримати дані для точки', color: 'red' });
    }
  };

  const handleViewHistory = async (regionId, regionName) => {
    setHistoryRegionName(regionName);
    openHistory();
    setHistoryLoading(true);
    try {
      const res = await api.get(`/pollution/history?regionId=${regionId}&limit=20`);
      // Reverse so oldest is first for chart
      const sorted = res.data.reverse().map(d => ({
        date: new Date(d.recorded_at).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
        aqi: d.aqi,
        pm2_5: parseFloat(d.pm2_5),
        pm10: parseFloat(d.pm10)
      }));
      setHistoryData(sorted);
    } catch (err) {
      notifications.show({ title: 'Помилка', message: 'Не вдалося завантажити історію', color: 'red' });
    } finally {
      setHistoryLoading(false);
    }
  };

  const getAqiColor = (aqi) => {
    if (!aqi) return 'gray';
    if (aqi <= 1) return 'teal';
    if (aqi === 2) return 'green';
    if (aqi === 3) return 'yellow';
    if (aqi === 4) return 'orange';
    return 'red';
  };

  if (loading) {
    return (
      <Center style={{ height: '80vh' }}>
        <Loader color="teal" size="xl" type="dots" />
      </Center>
    );
  }

  const rows = averagesData.map((element) => (
    <Table.Tr key={element.region_id}>
      <Table.Td>
        <Group gap="xs">
          <IconMapPin size={16} />
          <Text fw={500}>{element.region_name}</Text>
        </Group>
      </Table.Td>
      <Table.Td>
        <Badge color={getAqiColor(Math.round(element.avg_aqi))}>
          {element.avg_aqi ? element.avg_aqi : 'N/A'}
        </Badge>
      </Table.Td>
      <Table.Td>{element.avg_pm2_5 || '-'}</Table.Td>
      <Table.Td>{element.avg_pm10 || '-'}</Table.Td>
      <Table.Td>{element.avg_no2 || '-'}</Table.Td>
      <Table.Td>{element.avg_co || '-'}</Table.Td>
      <Table.Td>{element.measurements_count}</Table.Td>
    </Table.Tr>
  ));

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <Stack gap={0}>
          <Title order={2} style={{ fontFamily: 'Greycliff CF, var(--mantine-font-family)' }}>Екологічні показники</Title>
          <Text c="dimmed">Огляд забруднення повітря у реальному часі та середні значення</Text>
        </Stack>
        <Group>
          <TextInput
            placeholder="Знайти місто..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            rightSection={
              searching ? <Loader size="xs" /> : <IconSearch size={16} style={{ cursor: 'pointer' }} onClick={handleSearch} />
            }
          />
          <Button 
            leftSection={<IconRefresh size={18} />} 
            color="teal" 
            onClick={handleFetchUpdate}
            loading={fetching}
          >
            Оновити дані
          </Button>
        </Group>
      </Group>

      <Grid>
        <Grid.Col span={12}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={4} mb="md">Інтерактивна карта якості повітря</Title>
            <MapComponent data={latestData} onMapClick={handleMapClick} clickedData={clickedData} onViewHistory={handleViewHistory} />
            <Text size="sm" c="dimmed" mt="sm">* Клікніть на будь-яку точку на карті, щоб переглянути дані для цієї локації.</Text>
          </Card>
        </Grid.Col>

        <Grid.Col span={12}>
          <Card shadow="sm" padding="lg" radius="md" withBorder mt="lg">
            <Title order={4} mb="md">Довідник показників</Title>
            <Accordion variant="separated">
              <Accordion.Item value="aqi">
                <Accordion.Control icon={<IconInfoCircle size={20} color="teal" />}>Індекс якості повітря (AQI)</Accordion.Control>
                <Accordion.Panel>
                  AQI (Air Quality Index) — це показник, що відображає рівень забруднення повітря. 
                  1 = Добре, 2 = Задовільно, 3 = Помірно, 4 = Погано, 5 = Дуже погано.
                </Accordion.Panel>
              </Accordion.Item>
              <Accordion.Item value="pm">
                <Accordion.Control icon={<IconInfoCircle size={20} color="orange" />}>Тверді частинки (PM2.5 та PM10)</Accordion.Control>
                <Accordion.Panel>
                  PM2.5 і PM10 — дрібні частинки пилу. PM2.5 є найбільш небезпечними, оскільки вони можуть проникати глибоко в легені та кров, викликаючи серцево-судинні та респіраторні захворювання.
                </Accordion.Panel>
              </Accordion.Item>
              <Accordion.Item value="gases">
                <Accordion.Control icon={<IconInfoCircle size={20} color="blue" />}>Гази (O3, NO2, CO)</Accordion.Control>
                <Accordion.Panel>
                  O3 (Озон) на рівні землі може викликати подразнення дихальних шляхів. NO2 (Діоксид азоту) утворюється від вихлопних газів авто та сприяє смогу. CO (Чадний газ) отруйний газ без запаху та кольору, знижує здатність крові переносити кисень.
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
          </Card>
        </Grid.Col>

        <Grid.Col span={12}>
          <Card shadow="sm" padding="lg" radius="md" withBorder mt="lg">
            <Title order={4} mb="md">Середні показники по регіонах</Title>
            <Table.ScrollContainer minWidth={800}>
              <Table striped highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Регіон</Table.Th>
                    <Table.Th>Сер. AQI</Table.Th>
                    <Table.Th>Сер. PM2.5 (μg/m³)</Table.Th>
                    <Table.Th>Сер. PM10 (μg/m³)</Table.Th>
                    <Table.Th>Сер. NO2 (μg/m³)</Table.Th>
                    <Table.Th>Сер. CO (μg/m³)</Table.Th>
                    <Table.Th>Кількість вимірів</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>{rows}</Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Card>
        </Grid.Col>
      </Grid>

      <Modal opened={historyOpened} onClose={closeHistory} title={`Історія якості повітря: ${historyRegionName}`} size="xl">
        {historyLoading ? (
          <Center p="xl"><Loader color="teal" /></Center>
        ) : historyData.length === 0 ? (
          <Text ta="center" c="dimmed">Немає історичних даних</Text>
        ) : (
          <Box h={400} mt="md">
            <LineChart
              h={350}
              data={historyData}
              dataKey="date"
              series={[
                { name: 'aqi', color: 'teal.6' },
                { name: 'pm2_5', color: 'blue.6' },
                { name: 'pm10', color: 'orange.6' }
              ]}
              curveType="linear"
              withLegend
              tooltipAnimationDuration={200}
            />
          </Box>
        )}
      </Modal>
    </Container>
  );
}
