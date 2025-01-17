import dayjs from 'dayjs';
import isLeapYear from 'dayjs/plugin/isLeapYear';
import React, {
	FormEvent,
	useCallback,
	useEffect,
	useState,
	useRef,
} from 'react';
import { Select } from '@/components/atoms/Select';
import { Button } from '@/components/atoms/Button';
import { InputTitle } from '@/components/molecules/InputTitle';
import { InputDescription } from '@/components/molecules/InputDescription';
import { ScheduleTypes } from '@/components/molecules/ScheduleTypes';
import { amountOfDay, dayTextCommmon } from '@/lib/calendar';
import { registerScheduleDetail } from '@/lib/supabase';

dayjs.extend(isLeapYear);

type Prop = {
	year: string;
	month: string;
	onEventCallBack: Function;
};

export function CalendarRegister(props: Prop): React.ReactElement {
	const isDisplay = useRef<boolean>(false);
	// 入力項目
	const [year, changeYear] = useState<string>(
		props.year ? props.year : dayTextCommmon('YYYY'),
	);
	const [month, changeMonth] = useState<string>(
		props.month ? props.month : dayTextCommmon('MM'),
	);
	const [day, changeDay] = useState<string>('');
	const [title, changeTitle] = useState<string>('');
	const [description, changeDescription] = useState<string>('');
	const [type, changeType] = useState<number>(1);

	// カレンダーの年月日のリスト
	const [nowYearList, setYearList] = useState<string[]>([]);
	const [nowMonthList, setMonthList] = useState<string[]>([]);
	const [nowDayList, setDayList] = useState<string[]>([]);

	// バリデーション
	const [titleError, setTitleError] = useState<string>('');
	const [descriptionError, setDescriptionError] = useState<string>('');

	// カレンダーを読み込んだ時に選択できる年月日を設定する
	const firstSetCalendar = useCallback((): void => {
		const nowYearAndMonth = `${props.year}-${props.month}`;

		let yearList: string[] = [props.year];
		let monthList: string[] = [];
		let dayList: string[] = [];

		// 年(今月から10年後までの年を選択できるようにする)
		for (var i = 1; i <= 9; i++) {
			const setYear = dayjs(`${props.year}-01`).add(i, 'year').format('YYYY');
			yearList = [...yearList, setYear];
		}

		// 月(今年の今月以降の月を選択できるようにする)
		for (var n = 1; n <= 12; n++) {
			n >= Number(props.month) && (monthList = [...monthList, n.toString()]);
		}

		// 日(当日より後の日だけ選択できるようにする)
		for (var m = 1; m <= amountOfDay(nowYearAndMonth); m++) {
			const day = m.toString().padStart(2, '0');

			const checkData = dayjs(`${nowYearAndMonth}-${day}`);
			const dateCheck = checkData.isAfter(dayjs());

			dateCheck && (dayList = [...dayList, day]);
		}

		// 日リストの最初の値を選択している日にセットする
		changeDay(dayList[0]);

		setYearList(yearList);
		setMonthList(monthList);
		setDayList(dayList);
	}, [props.month, props.year]);

	const onChangeYear = useCallback(
		(
			selectedYear: string,
			selectedMonth: string,
			selectedDay: string,
		): void => {
			// まずは年を選択した年にセットする
			changeYear(() => selectedYear);

			const selectedDate = `${selectedYear}-${selectedMonth
				.toString()
				.padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`;

			const today = dayjs().format('YYYY-MM-DD');

			let monthList: string[] = [];
			let dayList: string[] = [];

			const thisMonthAmount = amountOfDay(dayjs().format('YYYY-MM'));
			const thisYear = dayjs().year();

			// 選択した年が過去の日になっちゃった時
			if (
				dayjs(selectedDate).isBefore(today) ||
				thisYear === Number(selectedYear)
			) {
				const todayMonth = dayjs().month() + 1;
				const todayDay = dayjs().date();

				for (var m = todayMonth; m <= 12; m++) {
					monthList = [...monthList, m.toString().padStart(2, '0')];
				}

				for (var d = todayDay + 1; d <= thisMonthAmount; d++) {
					dayList = [...dayList, d.toString().padStart(2, '0')];
				}

				// さらに選択している月と日が過去の日になっちゃっている時
				if (Number(selectedMonth) < todayMonth) {
					changeMonth(() => todayMonth.toString().padStart(2, '0'));
				}

				if (Number(selectedDay) < todayDay) {
					changeDay(() => (todayDay + 1).toString().padStart(2, '0'));
				}
			} else {
				// 違う時は月と日のリストを作り直す
				for (var mo = 1; mo <= 12; mo++) {
					monthList = [...monthList, mo.toString().padStart(2, '0')];
				}

				for (var da = 1; da <= thisMonthAmount; da++) {
					dayList = [...dayList, da.toString().padStart(2, '0')];
				}
			}

			setMonthList(monthList);
			setDayList(dayList);
		},
		[],
	);

	const onChangeMonth = useCallback(
		(
			selectedYear: string,
			selectedMonth: string,
			selectedDay: string,
		): void => {
			// まずは月を選択した月にセットする
			changeMonth(selectedMonth);

			// 今月なら当日以前の日付が選択されていないかを確認しないといけない
			const selectedYearAndMonth = `${selectedYear}-${selectedMonth
				.toString()
				.padStart(2, '0')}`;
			const nowMonth = dayjs().format('YYYY-MM');

			const amountOfMonth = amountOfDay(selectedYearAndMonth);

			let dayList: string[] = [];

			if (selectedYearAndMonth === nowMonth) {
				const today = dayjs();
				for (var i = 1; i <= amountOfMonth; i++) {
					const day = i.toString().padStart(2, '0');
					const date = `${selectedYearAndMonth}-${day}`;
					const checkDay = dayjs(date);

					checkDay.isAfter(today) && (dayList = [...dayList, day]);
				}

				const nowSelectedDay = Number(selectedDay).toString().padStart(2, '0');

				!dayList.includes(nowSelectedDay) && changeDay(nowSelectedDay);
			} else {
				for (var n = 1; n <= amountOfMonth; n++) {
					dayList = [...dayList, n.toString().padStart(2, '0')];
				}

				Number(selectedDay) > amountOfMonth &&
					changeDay(amountOfMonth.toString());
			}

			setDayList(dayList);
		},
		[],
	);

	const registerSchedule = useCallback(
		async (e: FormEvent<Element>): Promise<void> => {
			e.preventDefault();

			setTitleError(!title ? 'タイトルを入力してください。' : '');
			setDescriptionError(
				!description ? 'スケジュールの詳細を入力してください。' : '',
			);

			if (title && description) {
				const response = await registerScheduleDetail({
					year: Number(year),
					month: Number(month),
					day: Number(day),
					title,
					description,
					scheduleTypes: type,
				});

				if (!response) {
					alert('スケジュール登録完了！');
					setTitleError('');
					setDescriptionError('');
					return props.onEventCallBack();
				}
			}
		},
		[title, description, day, month, type, year, props],
	);

	useEffect(() => {
		if (!isDisplay.current) {
			isDisplay.current = true;
			firstSetCalendar();
		}
	}, [firstSetCalendar]);

	return (
		<form onSubmit={(e: FormEvent<Element>) => registerSchedule(e)}>
			<div className="mt-3 flex items-center">
				<label htmlFor="date" className="mr-2">
					日付:
				</label>
				<Select
					name="year"
					value={year}
					selectList={nowYearList}
					suffix="年"
					onEventCallBack={(year: string) => {
						onChangeYear(year, month, day);
					}}
				/>
				<Select
					name="month"
					value={month}
					selectList={nowMonthList}
					suffix="月"
					onEventCallBack={(month: string) => {
						onChangeMonth(year, month, day);
					}}
				/>
				<Select
					name="day"
					value={day}
					selectList={nowDayList}
					suffix="日"
					onEventCallBack={(day: string) => {
						changeDay(day);
					}}
				/>
			</div>
			<ScheduleTypes
				type={type}
				onEventCallBack={(e: string) => changeType(Number(e))}
			/>
			<InputTitle
				title={title}
				titleError={titleError}
				onChangeTitle={(text: string) => changeTitle(text)}
			/>
			<InputDescription
				description={description}
				descriptionError={descriptionError}
				onchangeDescription={(text: string) => changeDescription(text)}
			/>
			<div className="text-center mt-5">
				<Button
					type="submit"
					text="登録"
					buttonColor="#a7f3d0"
					underBarColor="#059669"
				/>
			</div>
		</form>
	);
}
