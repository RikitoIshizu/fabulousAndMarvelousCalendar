import dayjs from 'dayjs';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
	useEffect,
	useState,
	useCallback,
	ComponentType,
	ComponentProps,
} from 'react';
import ReactModal from 'react-modal';
import { specialDays } from '@/lib/calendar';
import {
	getScheduleDetail,
	deleteSchedule,
	// updateSchedule,
	// registerScheduleDetail,
} from '@/lib/supabase';
import type { Schedule } from '@/lib/types';
import { Schedule as ScheduleComponent } from './Components/Schedule';
import { CalendarRegister } from '../../components/parts/CalendarRegister';

const Modal = ReactModal as unknown as ComponentType<any>;

const modalContentStyles = {
	content: {
		top: '50%',
		left: '50%',
		right: 'auto',
		bottom: 'auto',
		marginRight: '-50%',
		transform: 'translate(-50%, -50%)',
		width: '62.5rem',
	},
};

const titleText = (date: string): string => {
	const today = dayjs();
	const selectedDay = dayjs(date);
	const selectedDayWithFormat = selectedDay.format('YYYYMMDD');

	if (today.format('YYYYMMDD') === selectedDayWithFormat) return '今日の予定';
	if (today.add(1, 'day').format('YYYYMMDD') === selectedDayWithFormat)
		return '明日の予定';
	if (today.add(-1, 'day').format('YYYYMMDD') === selectedDayWithFormat)
		return '昨日の予定';

	if (selectedDay.isBefore(today))
		return `${selectedDay.format('YYYY年M月D日')}に追加された予定`;

	return `${selectedDay.format('YYYY年M月D日')}の予定`;
};

export const DateDetail = () => {
	const router = useRouter();
	const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
	const [modalMode, setModalMode] = useState<'register' | 'edit'>('register');
	const [isNewScheduleLoading, setIsNewScheduleLoading] =
		useState<boolean>(false);
	const [schedules, setSchedules] = useState<Schedule[]>([]);

	// 編集用パラメータ
	const [scheduleId, setScheduleId] = useState<Schedule['id'] | ''>('');
	const [scheduleTitle, setScheduleTitle] = useState<Schedule['title']>('');
	const [scheduleDescription, setScheduletDescription] =
		useState<Schedule['description']>('');
	const [scheduleType, setScheduleType] =
		useState<Schedule['scheduleTypes']>(1);

	const date = useRouter().query.id as string;
	const registeringDate = dayjs(date);
	const year = registeringDate.format('YYYY');
	const month = registeringDate.format('MM');
	const day = registeringDate.format('DD');

	const loadSchedules = useCallback(async () => {
		const schedules = await getScheduleDetail(date);
		setSchedules(schedules);
	}, [date]);

	const specialDay = useCallback(() => {
		const md = dayjs(date).format('MMDD');

		return specialDays[md] ? specialDays[md] : '';
	}, [date]);

	const updSchedule: ComponentProps<
		typeof CalendarRegister
	>['onEventCallBack'] = useCallback(async (): Promise<void> => {
		// if (modalMode === 'register') {
		// 	const registeringDate = dayjs(date);
		// 	const year = registeringDate.format('YYYY');
		// 	const month = registeringDate.format('MM');
		// 	const day = registeringDate.format('DD');

		// 	const response = await registerScheduleDetail({
		// 		year: Number(year),
		// 		month: Number(month),
		// 		day: Number(day),
		// 		title: scheduleTitle,
		// 		description: scheduleDescription,
		// 		scheduleTypes: Number(scheduleType),
		// 	});

		// 	!response && alert('スケジュール登録完了！');
		// } else {
		// 	const response = await updateSchedule({
		// 		id: Number(scheduleId),
		// 		title: scheduleTitle,
		// 		description: scheduleDescription,
		// 		scheduleTypes: Number(scheduleType),
		// 	});

		// 	!response && alert('スケジュール変更完了！');
		// }

		setIsModalOpen(false);
		loadSchedules();
	}, [
		// scheduleTitle,
		// scheduleDescription,
		// scheduleType,
		// date,
		loadSchedules,
		// modalMode,
		// scheduleId,
	]);

	// 編集
	const openModal = useCallback(
		(id: Schedule['id']): void => {
			setModalMode('edit');
			const editSchedule = schedules?.filter((el) => el.id === id);

			if (!editSchedule?.length) return;

			setScheduleId(editSchedule[0].id);
			setScheduleTitle(editSchedule[0].title);
			setScheduletDescription(editSchedule[0].description);
			setScheduleType(editSchedule[0].scheduleTypes);
			setIsModalOpen(true);
		},
		[schedules],
	);

	// 登録
	const openRegisterScheduleModal = () => {
		setIsModalOpen(true);
		setModalMode('register');
		setScheduleId('');
		setScheduleTitle('');
		setScheduletDescription('');
	};

	const confirmShouldDeleteSchedule = useCallback(
		async (id: Schedule['id']) => {
			setIsNewScheduleLoading(true);
			const response = await deleteSchedule(id);

			if (!response) {
				loadSchedules();
				setIsNewScheduleLoading(false);
			}
		},
		[loadSchedules],
	);

	useEffect(() => {
		router.isReady && loadSchedules();
	}, [router, loadSchedules]);

	return (
		<main>
			<section className="my-2 relative">
				{typeof date === 'string' && !!date && (
					<h1 className="text-4xl font-bold text-center">{titleText(date)}</h1>
				)}
				<div className="w-[1000px] mx-auto">
					{specialDay() && (
						<section>
							<h2 className="text-2xl font-bold">今日は何の日？</h2>
							<div className="mt-1">{specialDay()}</div>
						</section>
					)}
					<ScheduleComponent
						schedules={schedules}
						date={date}
						onOpenRegisterScheduleModal={openRegisterScheduleModal}
						onOpenModal={openModal}
						onDeleteSchedule={confirmShouldDeleteSchedule}
					/>
					<div className="mt-6 text-center">
						<Link href="/" className="w-[100px] h-[50px] text-blue-700">
							戻る
						</Link>
					</div>
				</div>
			</section>
			<Modal
				isOpen={isModalOpen}
				ariaHideApp={false}
				onRequestClose={() => setIsModalOpen(false)}
				style={modalContentStyles}
				contentLabel="Example Modal"
			>
				<div>予定を登録</div>
				<CalendarRegister
					onEventCallBack={() => updSchedule()}
					type={modalMode}
					schedule={{
						year: Number(year),
						month: Number(month),
						day: Number(day),
						...(modalMode === 'edit' && {
							id: Number(scheduleId),
							title: scheduleTitle,
							description: scheduleDescription,
							scheduleTypes: scheduleType,
						}),
					}}
				/>
			</Modal>
			{isNewScheduleLoading && (
				<div className="fixed bg-white w-full h-full">読み込み中</div>
			)}
		</main>
	);
};