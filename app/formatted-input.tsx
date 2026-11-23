"use client";
import type {InputHTMLAttributes} from 'react';
import {Input} from '@/components/ui/input';
import {displayDate,displayTime} from './date-format';
export function FormattedInput(props:InputHTMLAttributes<HTMLInputElement>){
 const value=String(props.value??props.defaultValue??'');
 return <span className={`formatted-date-input ${props.className||''}`}><Input {...props} lang="en-GB" className="formatted-native-input"/><span aria-hidden="true" className="formatted-input-label">{value?(props.type==='time'?displayTime(value):displayDate(value)):props.type==='time'?'--:--hs':'DD - MES - AA'}</span></span>;
}
